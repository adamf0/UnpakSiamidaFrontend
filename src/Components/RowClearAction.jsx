import React from "react";
import { AiOutlineClear } from "react-icons/ai";

const RowClearAction = ({
  status,
  onClear,
}) => {
  if (status === "loading") {
    return (
      <div
        className="
          w-[30px] h-[30px]
          rounded-full
          border-2 border-gray-300
          border-t-purple-500
          animate-spin
        "
      />
    );
  }

  return (
    <button
      type="button"
      className="
        flex justify-center items-center
        w-[30px] h-[30px]
        bg-purple-500 text-white
        rounded
      "
      onClick={onClear}
      title="Bersihkan data"
    >
      <AiOutlineClear />
    </button>
  );
};

export default RowClearAction;