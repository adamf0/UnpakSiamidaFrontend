import React, { useEffect, useRef, useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { v4 as uuidv4 } from "uuid";

const SearchSelect = ({
  label,
  required,
  options = [],
  placeholder,
  error,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);

  const containerRef = useRef(null);

  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  /* ===============================
     FILTER OPTIONS
  =============================== */
  useEffect(() => {
    if (!open) return;

    const q = query.toLowerCase();
    setFiltered(
      options.filter((o) =>
        o.nama?.toLowerCase().includes(q)
      )
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
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        ref={refs.setReference}
        value={value?.nama || query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          if(options.length>0){
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
          }
        }}
        className={`
          w-full px-3 py-2 text-sm rounded border outline-none
          transition
          ${
            error
              ? "border-red-500 focus:ring-0"
              : "border-gray-300 focus:ring-2 focus:ring-purple-600"
          }
        `}
      />

      {open && filtered.length > 0 && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-50 w-full bg-white border rounded shadow max-h-60 overflow-auto"
        >
          {filtered.map((item) => (
            <div
              key={uuidv4()}
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => {
                onChange(item);
                setQuery("");
                setOpen(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-purple-50"
            >
              {item.nama}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default SearchSelect;
