import React from "react";
import { AlertCircle, Check } from "lucide-react";
import Tooltip from "@/Components/Tooltip";

const RowStatusAction = ({
  status,
  errorMessage,
  onShowError,
}) => {
  if (!status) return null;

  const tooltipText =
    status === "loading"
      ? "Sedang diproses..."
      : status === "error"
      ? errorMessage || "Terjadi error - Klik untuk detail"
      : "Berhasil disimpan";

  return (
    <Tooltip content={tooltipText}>
      <button
        type="button"
        className="
          inline-flex justify-center items-center
          w-7 h-7 rounded-md transition-colors
          hover:bg-gray-100
        "
        onClick={() => {
          if (status === "error" && errorMessage) {
            onShowError?.(errorMessage);
          }
        }}
        aria-label={tooltipText}
      >
        {status === "loading" && (
          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
        )}
        {status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
        {status === "success" && <Check className="w-4 h-4 text-emerald-600" />}
      </button>
    </Tooltip>
  );
};

export default RowStatusAction;