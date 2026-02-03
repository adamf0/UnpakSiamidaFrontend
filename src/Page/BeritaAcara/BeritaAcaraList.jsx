import { useEffect, useRef, useState } from "react";
import BeritaAcaraCard from "./BeritaAcaraCard";
import { createPortal } from "react-dom";

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
        />
      )}
    </div>
  );
}

export function ActionMenu({ row, rect, onEdit, onDelete, onClose }) {
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
        top: rect.bottom + 4,
        left: rect.right - 150,
      }}
      className="z-50 w-36 bg-white border rounded shadow"
    >
      <button
        onClick={() => {
          onDownload(row);
          onClose();;
        }}
        className="block w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
      >
        Download
      </button>

      <button
        onClick={() => {
          onEdit(row);
          onClose();
        }}
        className="block w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
      >
        Edit
      </button>

      <button
        onClick={() => {
          onDelete(row);
          onClose();
        }}
        className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
      >
        Hapus
      </button>
    </div>,
    document.body,
  );
}
