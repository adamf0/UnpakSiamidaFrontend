import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  size,
} from "@floating-ui/react";
import { Portal } from "@headlessui/react";
import { Search, Check, X, ChevronDown, Loader2 } from "lucide-react";
import { apiClient } from "@/Common/api";

// Module-level cache for COA list to avoid duplicate network calls
let cachedCoaList = null;
let coaPromise = null;

export const fetchCoaOptions = async () => {
  if (cachedCoaList && cachedCoaList.length > 0) return cachedCoaList;
  if (!coaPromise) {
    coaPromise = apiClient
      .get("/proker_v3/coa")
      .then((res) => {
        const list = res.data?.data || [];
        cachedCoaList = list;
        return list;
      })
      .catch((err) => {
        console.error("Gagal memuat data COA:", err);
        coaPromise = null;
        return [];
      });
  }
  return coaPromise;
};

export default function CoaSearchSelect({
  valueNoAkun = "",
  valueNamaAkun = "",
  valueKategori = "",
  onChange,
  disabled = false,
  placeholder = "Pilih / cari akun COA...",
  className = "",
  options = null,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coaList, setCoaList] = useState(options || cachedCoaList || []);
  const [loading, setLoading] = useState(!options && !cachedCoaList);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (options && options.length > 0) {
      setCoaList(options);
      setLoading(false);
      return;
    }
    if (cachedCoaList && cachedCoaList.length > 0) {
      setCoaList(cachedCoaList);
      setLoading(false);
      return;
    }
    let isMounted = true;
    fetchCoaOptions().then((data) => {
      if (isMounted) {
        setCoaList(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [options]);

  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "fixed",
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            minWidth: `${Math.max(rects.reference.width, 360)}px`,
            maxWidth: "480px",
            maxHeight: `${Math.max(160, Math.min(availableHeight - 16, 320))}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Filtered list matching no_akun or nama_akun
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coaList.slice(0, 60);
    return coaList
      .filter((item) => {
        const no = String(item.no_akun || "").toLowerCase();
        const nama = String(item.nama_akun || "").toLowerCase();
        return no.includes(q) || nama.includes(q);
      })
      .slice(0, 60);
  }, [coaList, query]);

  // Display label
  const displayLabel = useMemo(() => {
    if (valueNoAkun && valueNamaAkun) {
      return `${valueNoAkun} - ${valueNamaAkun}`;
    }
    if (valueNoAkun) return valueNoAkun;
    if (valueNamaAkun) return valueNamaAkun;
    return valueKategori || "";
  }, [valueNoAkun, valueNamaAkun, valueKategori]);

  const handleSelect = (item) => {
    onChange?.({
      no_akun: item.no_akun,
      nama_akun: item.nama_akun,
      kategori: `${item.no_akun} - ${item.nama_akun}`,
    });
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.({
      no_akun: "",
      nama_akun: "",
      kategori: "",
    });
    setQuery("");
  };

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        refs.reference.current &&
        !refs.reference.current.contains(e.target) &&
        refs.floating.current &&
        !refs.floating.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, refs]);

  // Focus search input on open
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  if (disabled) {
    return (
      <div
        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800 truncate ${className}`}
        title={displayLabel || "-"}
      >
        {displayLabel || "-"}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <button
        ref={refs.setReference}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-h-[32px] px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-left flex items-center justify-between gap-1.5 transition shadow-2xs cursor-pointer ${className}`}
        title={displayLabel || placeholder}
      >
        <span
          className={`truncate flex-1 ${
            displayLabel ? "text-gray-900 font-semibold" : "text-gray-400"
          }`}
        >
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {displayLabel && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition cursor-pointer"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              open ? "rotate-180 text-purple-600" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <Portal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[99999] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs"
          >
            {/* Search Box Header */}
            <div className="p-2 border-b border-gray-100 bg-gray-50/90 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari no. akun / nama akun..."
                className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* List options */}
            <div className="overflow-y-auto max-h-60 divide-y divide-gray-50">
              {loading ? (
                <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Memuat daftar akun COA...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Tidak ditemukan akun COA yang cocok
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected =
                    String(item.no_akun) === String(valueNoAkun);
                  return (
                    <div
                      key={`${item.no_akun}-${item.nama_akun}-${idx}`}
                      onClick={() => handleSelect(item)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2.5 transition ${
                        isSelected
                          ? "bg-purple-50 font-semibold text-purple-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-100/70 text-purple-800 border border-purple-200 shrink-0">
                          {item.no_akun}
                        </span>
                        <span className="truncate">{item.nama_akun}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
              <span>Sumber: yps_siakun.m_coa</span>
              <span>{filtered.length} ditampilkan</span>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
