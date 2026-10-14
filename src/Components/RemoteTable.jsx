import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical, FiSearch } from "react-icons/fi";

/* =========================
   UTILS
========================= */
const buildFilterQuery = (filters) =>
  Object.entries(filters)
    .filter(([, v]) => v?.value)
    .map(([k, v]) => `${k}:${v.op}:${v.value}`)
    .join(";");

/* =========================
   MAIN COMPONENT
========================= */
const RemoteTable = forwardRef(function RemoteTable(
  {
    endpoint,
    listcolumns = [],
    listdata = null, //manul data
    mode = "paging", // paging | sse | ndjson
    renderAction,
    renderAddAction,
    allowedOps = ["like", "eq", "neq", "in"],
    adapter,
    onError,
    disableGlobalSearch=true,
    token,
    filterFn,
  },
  ref
) {
  const isManual = Array.isArray(listdata);
  const isStreaming = mode === "sse" || mode === "ndjson";
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);        // data yg dirender
  const [allRows, setAllRows] = useState([]);  // data mentah (SSE/NDJSON)
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [draftFilters, setDraftFilters] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);

  const [openAction, setOpenAction] = useState(null);

  const abortRef = useRef(null);
  const actionRef = useRef(null);

  useEffect(() => {
    if (!isManual) return;

    let data = [...(listdata || [])];
    if (typeof filterFn === "function") {
      data = data.filter(filterFn);
    }

    setTotal(data.length);

    const start = (page - 1) * limit;
    const end = start + limit;

    setRows(data.slice(start, end));
  }, [listdata, page, limit, isManual, filterFn]);
  
  const applyAdapter = (data) =>
    typeof adapter === "function" ? adapter(data) : data;

  /* =========================
     FETCH DATA (REUSABLE)
  ========================== */
  const loadData = async () => {
    if (isManual) {
      let data = [...listdata];
      setTotal(data.length);

      const start = (page - 1) * limit;
      const end = start + limit;
      setRows(data.slice(start, end));
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    if (isStreaming) {
      setAllRows([]);
      setRows([]);
      setTotal(0);
    } else {
      setRows([]);
      setTotal(0);
    }

    const filterQuery = buildFilterQuery(filters);

    let url;
    try {
      const parsedUrl = new URL(endpoint, window.location.origin);
      const existingFilters = parsedUrl.searchParams.get("filters");
      const combinedFilters = [existingFilters, filterQuery].filter(Boolean).join(";");

      parsedUrl.searchParams.set("mode", mode);
      parsedUrl.searchParams.set("page", String(page));
      parsedUrl.searchParams.set("limit", String(limit));
      if (search) {
        parsedUrl.searchParams.set("search", search);
      } else {
        parsedUrl.searchParams.delete("search");
      }

      if (combinedFilters) {
        parsedUrl.searchParams.set("filters", combinedFilters);
      } else {
        parsedUrl.searchParams.delete("filters");
      }
      url = parsedUrl.toString();
    } catch {
      const separator = endpoint.includes("?") ? "&" : "?";
      url =
        `${endpoint}${separator}mode=${mode}` +
        `&page=${page}&limit=${limit}` +
        `&search=${encodeURIComponent(search)}` +
        (filterQuery ? `&filters=${encodeURIComponent(filterQuery)}` : "");
    }

    try {
      const headers = {
        ...(mode === "sse" ? { Accept: "text/event-stream" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, {
        signal: controller.signal,
        headers: headers,
      });

      if (!res.ok) {
        setRows([]);
        setAllRows([]);
        setTotal(0);

        const err = {
          message: `HTTP ${res.status}`,
          status: res.status,
          endpoint: url,
        };

        setError(err);
        onError?.(err);
        return; // ⛔ STOP di sini
      }

      /* ===== SERVER PAGING ===== */
      if (mode === "paging") {
        const json = await res.json();
        const rawData = json?.data ?? json?.Data ?? (Array.isArray(json) ? json : []);
        const items = Array.isArray(rawData) ? rawData : [];
        setRows(applyAdapter(items));
        const totalCount = json?.total ?? json?.Total ?? items.length;
        setTotal(typeof totalCount === "number" ? totalCount : (Number(totalCount) || 0));
        return;
      }

      /* ===== SSE / NDJSON ===== */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const streamData = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          if (mode === "sse") {
            if (!line.startsWith("data:")) continue;
            const payload = line.replace("data:", "").trim();
            if (payload === "start" || payload === "done") continue;
            streamData.push(JSON.parse(payload));
          } else {
            streamData.push(JSON.parse(line));
          }
        }
      }

      const adapted = applyAdapter(streamData || []);
      setAllRows(adapted);
      setTotal(adapted.length);
    } catch (err) {
      if (err.name === "AbortError") {
        // Request dibatalkan dengan normal (re-render / query superseded), abaikan
        return;
      }
      console.error(err);

      const normalizedError = {
        message: err.message || "Gagal memuat data",
        endpoint,
        mode,
        time: new Date().toISOString(),
        raw: err,
      };

      setError(normalizedError);
      if (typeof onError === "function") {
        onError(normalizedError);
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     EXPOSE API TO PARENT
  ========================== */
  useImperativeHandle(ref, () => ({
    reload: ({ resetPage = false } = {}) => {
      if (resetPage) setPage(1);
      loadData();
    },
    reset: () => {
      setPage(1);
      setSearch("");
      setFilters({});
      loadData();
    },
    getError: () => error,
  }));

  /* =========================
     AUTO FETCH
  ========================== */
  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [
    endpoint,
    mode,
    search,
    filters,
    limit,
    isStreaming ? null : page,
    isManual,
  ]);

  /* =========================
     CLIENT PAGING (SSE)
  ========================== */
  useEffect(() => {
    if (!isStreaming) return;

    const filtered =
      typeof filterFn === "function" ? allRows.filter(filterFn) : allRows;

    setTotal(filtered.length);

    const start = (page - 1) * limit;
    const end = start + limit;
    setRows(filtered.slice(start, end));
  }, [allRows, page, limit, isStreaming, filterFn]);

  useEffect(() => {
    if (typeof filterFn === "function") {
      setPage(1);
    }
  }, [filterFn]);

  /* =========================
     CLICK OUTSIDE ACTION
  ========================== */
  useEffect(() => {
    const close = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setOpenAction(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextFilters = {};

      Object.entries(draftFilters).forEach(([key, { op, value }]) => {
        if (op && value && value.trim() !== "") {
          nextFilters[key] = { op, value: value.trim() };
        }
      });

      setFilters(prev => {
        if (isEqual(prev, nextFilters)) return prev; 
        return nextFilters;
      });

      setPage(p => (p === 1 ? p : 1));
    }, 500);

    return () => clearTimeout(timer);
  }, [draftFilters]);


  /* =========================
     RENDER
  ========================== */
  return (
    <div className="p-6 bg-white w-full max-w-full min-w-0">
      {/* SEARCH */}
      <div className="flex justify-start gap-2 relative mb-4">
        {
        disableGlobalSearch &&
          <div className="flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={(e) => {
                  setSearch(searchInput);
                  setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setPage(1);
                  e.currentTarget.blur();
                }
              }}
              placeholder="Cari data..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
        }
        {renderAddAction}
      </div>

      {/* TABLE */}
      {/*table-fixed*/}
      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full min-w-max">
          <colgroup>
            {listcolumns.map((c, i) => (
              <col
                key={c.key ? `${c.key}-${i}` : i}
                style={{
                  ...(c.width ? { width: c.width } : {}),
                  ...(c.minWidth ? { minWidth: c.minWidth } : {}),
                  ...(c.searchable && !c.minWidth && (!c.width || parseInt(c.width, 10) < 175)
                    ? { minWidth: "175px" }
                    : {}),
                }}
              />
            ))}
            {typeof renderAction === "function" && <col style={{ width: "60px" }} />}
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              {listcolumns.map((c, i) => {
                const effectiveMinWidth =
                  c.minWidth ||
                  (c.searchable && (!c.width || parseInt(c.width, 10) < 175)
                    ? "175px"
                    : c.width);

                return (
                  <th
                    key={c.key ? `${c.key}-${c.label || i}` : (c.label || i)}
                    className={`px-4 py-2.5 text-sm text-left ${c.className || ""}`}
                    style={{
                      ...(c.width ? { width: c.width } : {}),
                      ...(effectiveMinWidth ? { minWidth: effectiveMinWidth } : {}),
                      ...(c.maxWidth ? { maxWidth: c.maxWidth } : {}),
                    }}
                  >
                    <div className="font-semibold text-gray-800 mb-1.5 whitespace-nowrap">{c.label}</div>

                    {c.searchable && (
                      <div className="flex h-9 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition">
                        <select
                          className="px-2 text-xs bg-gray-50 border-r border-gray-200 shrink-0 text-gray-700 outline-none cursor-pointer font-medium"
                          value={draftFilters[c.key]?.op ?? allowedOps[0]}
                          onChange={(e) => {
                            const op = e.target.value;

                            setDraftFilters((prev) => ({
                              ...prev,
                              [c.key]: {
                                ...prev[c.key],
                                op,
                              },
                            }));
                          }}
                        >
                          {(c.allowedOps || allowedOps).map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>

                        <input
                          className="flex-1 min-w-0 px-2.5 text-xs outline-none text-gray-800 placeholder-gray-400"
                          placeholder="filter…"
                          value={draftFilters[c.key]?.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;

                            setDraftFilters((prev) => ({
                              ...prev,
                              [c.key]: {
                                op: prev[c.key]?.op ?? "like",
                                value,
                              },
                            }));
                          }}
                        />
                      </div>
                    )}
                  </th>
                );
              })}
              {typeof renderAction === "function" && (
                <th className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-center whitespace-nowrap">Aksi</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={listcolumns.length + (typeof renderAction === "function" ? 1 : 0)} className="py-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r, idx) => (
                <tr key={r.id || r.UUID || r.uuid || idx} className="border-t">
                  {listcolumns.map((c, i) => (
                    <td
                      key={c.key ? `${c.key}-${i}` : i}
                      className={`px-4 py-3 text-sm ${c.className || ""}`}
                      style={c.width ? { width: c.width, maxWidth: c.maxWidth || c.width } : undefined}
                    >
                      {c.renderKey ? c.renderKey(r) : r[c.key]}
                    </td>
                  ))}
                  {typeof renderAction === "function" && (
                    <td className="px-4 py-3 text-right relative">
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer ${
                          openAction?.row === r ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200" : ""
                        }`}
                        title="Pilihan Aksi"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setOpenAction((prev) => (prev?.row === r ? null : { row: r, rect }));
                        }}
                      >
                        <FiMoreVertical size={16} />
                      </button>

                      {openAction &&
                        openAction.row === r &&
                        createPortal(
                          <div
                            ref={actionRef}
                            style={{
                              position: "fixed",
                              top:
                                openAction.rect.bottom + 6 > window.innerHeight - 250
                                  ? Math.max(8, openAction.rect.top - 230)
                                  : openAction.rect.bottom + 6,
                              left: Math.max(12, openAction.rect.right - 185),
                            }}
                            className="z-50 min-w-[175px] max-w-[220px] bg-white border border-gray-200/90 rounded-2xl shadow-xl ring-1 ring-black/5 p-1.5 animate-in fade-in zoom-in-95 duration-100 text-left [&_button]:text-left [&_button]:rounded-lg [&_button]:transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderAction({
                              row: openAction.row,
                              close: () => setOpenAction(null),
                            })}
                          </div>,
                          document.body
                        )}
                    </td>
                  )}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={listcolumns.length + (typeof renderAction === "function" ? 1 : 0)}
                  className="py-6 text-center text-gray-500"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {(() => {
        const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
        const isPrevDisabled = page <= 1 || loading;
        const isNextDisabled = page >= totalPages || total === 0 || loading;

        return (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-white">
            <span className="text-sm text-gray-600">
              Page {page} / {totalPages} · Total Data {total}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPrevDisabled}
                onClick={() => !isPrevDisabled && setPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1.5 border rounded text-sm font-medium transition-colors ${
                  isPrevDisabled
                    ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 active:bg-gray-100"
                }`}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={isNextDisabled}
                onClick={() => !isNextDisabled && setPage((p) => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 border rounded text-sm font-medium transition-colors ${
                  isNextDisabled
                    ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 active:bg-gray-100"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default RemoteTable;