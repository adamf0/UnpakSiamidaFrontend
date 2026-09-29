import React from "react";
import { AiOutlineClear } from "react-icons/ai";
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
      <div className="w-[30px] h-[30px] flex items-center justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-purple-500 animate-spin" />
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
            w-[30px] h-[30px]
            rounded transition-colors
            ${
              disabled
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed pointer-events-none"
                : "bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white cursor-pointer shadow-xs"
            }
          `}
          onClick={disabled ? undefined : onClear}
          aria-label={disabled ? (disabledTitle || title) : title}
        >
          <AiOutlineClear size={16} />
        </button>
      </span>
    </Tooltip>
  );
};

export default RowClearAction;