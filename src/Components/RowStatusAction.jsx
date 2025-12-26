import React from "react";
import { MessageCircle } from "lucide-react";

const RowStatusAction = ({
  status,
  errorMessage,
  onShowError,
}) => {
  if (!status) return null;

  const baseClass =
    "flex justify-center items-center w-[30px] h-[30px] rounded-full";

  const statusClass =
    status === "loading"
      ? "text-gray-400"
      : status === "error"
      ? "text-red-500"
      : "text-green-500";

  return (
    <button
      type="button"
      className={`${baseClass} ${statusClass}`}
      onClick={() => {
        if (status === "error" && errorMessage) {
          onShowError?.(errorMessage);
        }
      }}
      title={
        status === "loading"
          ? "Sedang diproses"
          : status === "error"
          ? "Terjadi error"
          : "Berhasil"
      }
    >
      {status === "loading" && <MessageCircle className="opacity-50" />}
      {status === "error" && <MessageCircle />}
      {status === "success" && "✓"}
    </button>
  );
};

export default RowStatusAction;