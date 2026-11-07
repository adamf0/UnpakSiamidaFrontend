import React from "react";
import { Eraser } from "lucide-react";
import Tooltip from "@/Components/Tooltip";

const RowClearAction = ({
  status,
  onClear,
  title = "Bersihkan data baris",
  disabledTitle = "Tidak ada data untuk dibersihkan",
  disabled = false,
}) => {
  if (status === "loading") {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <Tooltip content={disabled ? disabledTitle : title}>
      <span className={`inline-flex ${disabled ? "cursor-not-allowed" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          className={`
            flex justify-center items-center
            w-7 h-7 rounded-lg transition
            ${
              disabled
                ? "bg-gray-50 text-gray-300 border border-gray-200/60 cursor-not-allowed pointer-events-none"
                : "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 cursor-pointer shadow-2xs"
            }
          `}
          onClick={disabled ? undefined : onClear}
          aria-label={disabled ? (disabledTitle || title) : title}
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </span>
    </Tooltip>
  );
};

export default RowClearAction;