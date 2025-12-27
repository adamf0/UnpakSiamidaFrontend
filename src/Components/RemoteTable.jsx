import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical, FiSearch } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";

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

    setTotal(data.length);

    const start = (page - 1) * limit;
    const end = start + limit;

    setRows(data.slice(start, end));
  }, [listdata, page, limit, isManual]);
  
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

    const url =
      `${endpoint}?mode=${mode}` +
      `&page=${page}&limit=${limit}` +
      `&search=${encodeURIComponent(search)}` +
      (filterQuery ? `&filters=${encodeURIComponent(filterQuery)}` : "");

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: mode === "sse" ? { Accept: "text/event-stream" } : undefined,
      });

      /* ===== SERVER PAGING ===== */
      if (mode === "paging") {
        const json = await res.json();
        setRows(applyAdapter(json.data || json || []));
        setTotal(json.total || 0);
        return;
      }

      /* ===== SSE / NDJSON ===== */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const data = [];

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
            data.push(JSON.parse(payload));
          } else {
            data.push(JSON.parse(line));
          }
        }
      }

      const adapted = applyAdapter(data || []);
      setAllRows(adapted);
      setTotal(adapted.length);
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);

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

    const start = (page - 1) * limit;
    const end = start + limit;
    setRows(allRows.slice(start, end));
  }, [allRows, page, limit, isStreaming]);

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
    <div className="p-6 bg-white">
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
      <div className="overflow-x-auto">
        <table className="w-full ">
          <colgroup>
            {listcolumns.map(() => (
              <col key={uuidv4()} />
            ))}
            <col style={{ width: "60px" }} />
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              {listcolumns.map((c) => (
                <th key={c.label} className="px-4 py-2 text-sm text-left">
                  <div className="font-medium mb-1">{c.label}</div>

                  {c.searchable && (
                    <div className="flex h-9 border rounded-md overflow-hidden bg-white">
                      <select
                        className="px-2 text-xs bg-gray-50 border-r shrink-0"
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
                        // value={filters[c.key]?.op || allowedOps[0]}
                        // onChange={(e) =>
                        //   setFilters((f) => ({
                        //     ...f,
                        //     [c.key]: {
                        //       ...(f[c.key] || {}),
                        //       op: e.target.value,
                        //     },
                        //   }))
                        // }
                      >
                        {(c.allowedOps || allowedOps).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>

                      <input
                        className="flex-1 px-2 text-xs outline-none"
                        placeholder="filter…"
                        // value={filters[c.key]?.value || ""}
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
                        // onChange={(e) => { 
                        //   setFilters((f) => ({
                        //     ...f,
                        //     [c.key]: {
                        //       op: f[c.key]?.op || "like",
                        //       value: e.target.value,
                        //     },
                        //   }));
                        //   setPage(1);
                        // }}
                      />
                    </div>
                  )}
                </th>
              ))}
              <th className="px-4 py-2 text-sm">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={listcolumns.length + 1} className="py-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r) => (
                <tr key={uuidv4()} className="border-t">
                  {listcolumns.map((c) => (
                    <td key={uuidv4()} className="px-4 py-3 text-sm">
                      {c.renderKey ? c.renderKey(r) : r[c.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right relative">
                    {
                      typeof adapter === "function" &&
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setOpenAction({ row: r, rect });
                        }}
                      >
                        <FiMoreVertical />
                      </button>
                    }

                    {openAction &&
                      createPortal(
                        <div
                          ref={actionRef}
                          style={{
                            position: "fixed",
                            top: openAction.rect.bottom + 4,
                            left: openAction.rect.right - 150,
                          }}
                          className="z-50 w-36 bg-white border rounded shadow"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderAction({
                            row: r,
                            close: () => setOpenAction(null),
                          })}
                        </div>,
                        document.body
                      )}
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={listcolumns.length + 1}
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
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm">
          Page {page} / {total>0? Math.ceil(total / limit):1}  · Total Data {total}
        </span>

        <div className="flex gap-2"> {/*[pr] bemum atur disable*/}
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
});

export default RemoteTable;