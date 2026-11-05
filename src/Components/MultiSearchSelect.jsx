import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  size,
} from "@floating-ui/react";
import { Portal } from "@headlessui/react";
import { Check, ChevronDown, X, Search, CheckSquare, Square } from "lucide-react";

const getItemId = (obj) => {
  if (!obj) return undefined;
  if (typeof obj !== "object") return obj;
  return obj.id ?? obj.UUID ?? obj.uuid ?? obj.Uuid ?? obj.iku;
};

const getItemLabel = (obj) => {
  if (!obj) return "";
  if (typeof obj !== "object") return String(obj);
  return obj.iku ?? obj.label ?? obj.nama ?? obj.text ?? "";
};

export default function MultiSearchSelect({
  label,
  required,
  icon: Icon,
  options = [],
  placeholder = "Semua Pilihan",
  value = [], // array of selected items or IDs
  onChange,
  disabled = false,
  className = "",
  badgeRenderer,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const floatingMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Set of selected IDs for fast lookup
  const selectedIdSet = useMemo(() => {
    const s = new Set();
    if (Array.isArray(value)) {
      value.forEach((v) => {
        const id = getItemId(v);
        if (id !== undefined) s.add(String(id));
      });
    }
    return s;
  }, [value]);

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
            width: `${Math.max(rects.reference.width, 280)}px`,
            maxHeight: `${Math.max(160, Math.min(availableHeight - 16, 320))}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => {
      const lbl = getItemLabel(o).toLowerCase();
      const kat = o?.kategori ? String(o.kategori).toLowerCase() : "";
      const jenis = o?.jenis_iku ? String(o.jenis_iku).toLowerCase() : "";
      return lbl.includes(q) || kat.includes(q) || jenis.includes(q);
    });
  }, [options, query]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!floatingMenuRef.current || !floatingMenuRef.current.contains(e.target))
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleToggleItem = (item) => {
    const itemId = String(getItemId(item));
    const isSelected = selectedIdSet.has(itemId);

    let nextValue;
    if (isSelected) {
      nextValue = value.filter((v) => String(getItemId(v)) !== itemId);
    } else {
      nextValue = [...value, item];
    }
    onChange?.(nextValue);
  };

  const handleSelectAll = () => {
    onChange?.([...options]);
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    onChange?.([]);
  };

  // Trigger text preview
  const triggerText = useMemo(() => {
    if (value.length === 0) {
      return placeholder;
    }
    if (value.length === 1) {
      return getItemLabel(value[0]);
    }
    return `${value.length} IKU dipilih`;
  }, [value, placeholder]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        ref={refs.setReference}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-xl border cursor-pointer select-none
          transition-all
          ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-gray-50/80 hover:bg-white focus:bg-white text-gray-800 border-gray-200"}
          ${open ? "ring-2 ring-purple-500/20 border-purple-500 bg-white" : ""}
          ${className}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && (
            <Icon className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-purple-600" />
          )}
          <span
            className={`truncate font-medium ${
              value.length === 0 ? "text-gray-400" : "text-gray-800"
            }`}
          >
            {triggerText}
          </span>
          {value.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-2xs font-extrabold bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              {value.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition cursor-pointer"
              title="Reset pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              open ? "rotate-180 text-purple-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu Portal */}
      {open && !disabled && (
        <Portal>
          <div
            ref={(node) => {
              refs.setFloating(node);
              floatingMenuRef.current = node;
            }}
            style={floatingStyles}
            className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col overflow-hidden text-xs"
          >
            {/* Search Box Header */}
            <div className="p-2 border-b border-gray-150 bg-gray-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari IKU..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Action Toolbar: Pilih Semua & Reset */}
              <div className="flex items-center justify-between mt-1.5 px-0.5 text-2xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-purple-600 hover:text-purple-800 font-semibold cursor-pointer hover:underline"
                >
                  Pilih Semua ({options.length})
                </button>
                {value.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer hover:underline"
                  >
                    Hapus Pilihan ({value.length})
                  </button>
                )}
              </div>
            </div>

            {/* List Items */}
            <div className="overflow-y-auto max-h-56 divide-y divide-gray-50 p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Data IKU tidak ditemukan
                </div>
              ) : (
                filteredOptions.map((item, idx) => {
                  const itemId = String(getItemId(item));
                  const isSelected = selectedIdSet.has(itemId);

                  return (
                    <div
                      key={itemId || idx}
                      onClick={() => handleToggleItem(item)}
                      className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-purple-50/80 text-purple-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-gray-300 bg-white hover:border-purple-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isSelected ? "text-purple-800" : "text-gray-900"
                            }`}
                          >
                            {item.iku || getItemLabel(item)}
                          </span>

                          {badgeRenderer ? (
                            badgeRenderer(item)
                          ) : item.jenis_iku ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-2xs font-extrabold uppercase ${
                                String(item.jenis_iku).toUpperCase() === "WAJIB"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : String(item.jenis_iku).toUpperCase() ===
                                    "PILIHAN"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-teal-50 text-teal-800 border border-teal-200"
                              }`}
                            >
                              {item.jenis_iku}
                            </span>
                          ) : null}
                        </div>

                        {item.kategori && (
                          <p className="text-2xs text-gray-500 mt-0.5 line-clamp-1">
                            {item.kategori}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Status */}
            <div className="px-3 py-1.5 border-t border-gray-150 bg-gray-50/80 text-2xs text-gray-500 flex items-center justify-between">
              <span>{value.length} dari {options.length} IKU dipilih</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-purple-700 font-bold hover:underline cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
