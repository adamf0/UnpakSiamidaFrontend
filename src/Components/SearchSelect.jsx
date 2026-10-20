import React, { useEffect, useRef, useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  size,
} from "@floating-ui/react";
import { Portal } from "@headlessui/react";
import { Check, AlertCircle, ChevronDown, X } from "lucide-react";
import { formatFetchError } from "@/Common/Utils";

const getItemId = (obj) => {
  if (!obj) return undefined;
  if (typeof obj !== "object") return obj;
  return obj.id ?? obj.UUID ?? obj.uuid ?? obj.Uuid ?? obj.IndikatorUuid;
};

const getItemLabel = (obj) => {
  if (!obj) return "";
  if (typeof obj !== "object") return String(obj);
  return obj.label ?? obj.nama ?? obj.text ?? obj.MataProgram ?? obj.mata_program ?? "";
};

const isItemSelected = (item, selectedVal) => {
  if (!item || !selectedVal) return false;
  const itemId = getItemId(item);
  const valId = getItemId(selectedVal);
  if (
    itemId !== undefined &&
    valId !== undefined &&
    itemId !== "" &&
    valId !== ""
  ) {
    return String(itemId) === String(valId);
  }
  const itemLabel = getItemLabel(item);
  const valLabel = getItemLabel(selectedVal);
  return Boolean(itemLabel && valLabel && itemLabel === valLabel);
};

const SearchSelect = ({
  label,
  required,
  icon: Icon,
  options = [],
  placeholder,
  error,
  loadError,
  loading = false,
  onRetry,
  disabled = false,
  value,
  onChange,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filtered, setFiltered] = useState([]);

  const containerRef = useRef(null);
  const floatingMenuRef = useRef(null);

  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "fixed",
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.max(120, Math.min(availableHeight - 16, 240))}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const formattedLoadError = loadError ? formatFetchError(loadError) : null;

  /* ===============================
     FILTER OPTIONS
  =============================== */
  useEffect(() => {
    if (!open) return;

    const q = query.toLowerCase().trim();
    if (!q) {
      setFiltered(options);
      return;
    }

    setFiltered(
      options.filter((o) => {
        const lbl = getItemLabel(o).toLowerCase();
        const thn = o?.tahun ? String(o.tahun).toLowerCase() : "";
        const mp = o?.mata_program ? String(o.mata_program).toLowerCase() : "";
        const bdg = o?.badge ? String(o.badge).toLowerCase() : "";
        const raw = o?.raw_nama ? String(o.raw_nama).toLowerCase() : "";
        return (
          lbl.includes(q) ||
          thn.includes(q) ||
          mp.includes(q) ||
          bdg.includes(q) ||
          raw.includes(q)
        );
      })
    );
  }, [query, open, options]);

  /* ===============================
     CLICK OUTSIDE → CLOSE
  =============================== */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!floatingMenuRef.current || !floatingMenuRef.current.contains(e.target))
      ) {
        setOpen(false);
        setIsSearching(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (loading) {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div
          className="w-full h-[38px] px-3 py-2 rounded border border-gray-200 bg-gray-100 flex items-center justify-between animate-pulse"
          aria-busy="true"
          aria-label={`Memuat data ${label || "dropdown"}`}
        >
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const displayValue = isSearching ? query : getItemLabel(value) || query;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={refs.setReference}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onFocus={(e) => {
            if (!disabled) {
              setOpen(true);
              e.target.select();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setIsSearching(false);
              setQuery("");
            }
          }}
          onChange={(e) => {
            if (disabled) return;
            const nextVal = e.target.value;
            setIsSearching(true);
            setQuery(nextVal);
            setOpen(true);
            if (nextVal === "") {
              onChange?.(null);
            }
          }}
          className={`
            w-full ${Icon ? "pl-9" : "pl-3"} pr-10 py-2 text-sm rounded-xl border outline-none
            transition
            ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-white text-gray-800"}
            ${
              error || formattedLoadError
                ? "border-red-500 focus:ring-0"
                : "border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }
            ${className}
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {Boolean(value) && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange?.(null);
                setQuery("");
                setIsSearching(false);
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 pointer-events-none transition-transform duration-200 ${
              open ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </div>

      {open && !disabled && (
        <Portal>
          <div
            ref={(node) => {
              refs.setFloating(node);
              floatingMenuRef.current = node;
            }}
            style={floatingStyles}
            className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto max-h-64 py-1"
          >
          {formattedLoadError ? (
            <div className="px-3 py-2.5 text-xs text-red-600 bg-red-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formattedLoadError}</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onRetry()}
                  className="font-semibold underline hover:text-red-800 shrink-0"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const selected = isItemSelected(item, value);
              return (
                <div
                  key={
                    item.id ??
                    item.uuid ??
                    item.UUID ??
                    item.nama ??
                    item.text ??
                    idx
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange?.(item);
                    setIsSearching(false);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 flex items-center justify-between gap-2 ${
                    selected
                      ? "bg-purple-50/70 font-medium text-purple-700"
                      : "text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.tahun ? (
                      <span className="px-1.5 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-700 rounded border border-purple-200 shrink-0">
                        {item.tahun}
                      </span>
                    ) : null}
                    {item.badge ? (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider shrink-0 ${
                          item.badgeClass ||
                          (String(item.badge).toLowerCase() === "fakultas"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : String(item.badge).toLowerCase() === "unit"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200")
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                    <span className="truncate">
                      {item.display_name || item.mata_program || getItemLabel(item)}
                    </span>
                  </div>
                  {selected && (
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">
              Data tidak ditemukan
            </div>
          )}
        </div>
        </Portal>
      )}

      {formattedLoadError && (
        <div className="mt-1 flex items-center justify-between gap-2 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span>{formattedLoadError}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={() => onRetry()}
              className="font-semibold underline hover:text-red-800 shrink-0"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default SearchSelect;

