import { useEffect, useRef, useState } from "react";
import BeritaAcaraCard from "./BeritaAcaraCard";
import { createPortal } from "react-dom";
import { Download, Pencil, Trash2 } from "lucide-react";

export default function BeritaAcaraList({ datas, onDownload, onEdit, onDelete }) {
  const [openAction, setOpenAction] = useState(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {datas.map((row) => (
        <BeritaAcaraCard
          key={row.UUID}
          row={row}
          onOpenAction={setOpenAction}
        />
      ))}

      {/* contoh render action menu */}
      {openAction && (
        <ActionMenu
          row={openAction.row}
          rect={openAction.rect}
          onClose={() => setOpenAction(null)}
          onEdit={onEdit}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      )}
    </div>
  );
}

export function ActionMenu({ row, rect, onEdit, onDelete, onDownload, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: Math.max(12, rect.right - 170),
      }}
      className="z-50 min-w-[170px] bg-white border border-gray-200/90 rounded-2xl shadow-xl ring-1 ring-black/5 p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
    >
      <button
        type="button"
        onClick={() => {
          onDownload(row);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-sky-700 hover:bg-sky-50/80 rounded-xl transition-all cursor-pointer text-left group"
      >
        <Download className="w-4 h-4 text-sky-600 shrink-0 group-hover:scale-110 transition-transform" />
        <span>Download</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onEdit(row);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
      >
        <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
        <span>Edit</span>
      </button>

      <div className="my-1 border-t border-gray-150" />

      <button
        type="button"
        onClick={() => {
          onDelete(row);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
      >
        <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
        <span>Hapus</span>
      </button>
    </div>,
    document.body
  );
}
