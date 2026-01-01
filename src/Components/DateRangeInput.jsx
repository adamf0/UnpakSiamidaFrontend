import React from "react";

export default function DateRangeInput({
  label,
  required = false,
  start,
  end,
  startError,
  endError,
}) {
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <input
            type="date"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2
              ${
                startError
                  ? "border-red-500 focus:ring-red-300"
                  : "border-gray-300 focus:ring-blue-300"
              }`}
            {...start}
          />
          {startError && (
            <p className="text-xs text-red-500 mt-1">{startError}</p>
          )}
        </div>

        <div className="flex-1">
          <input
            type="date"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2
              ${
                endError
                  ? "border-red-500 focus:ring-red-300"
                  : "border-gray-300 focus:ring-blue-300"
              }`}
            {...end}
          />
          {endError && (
            <p className="text-xs text-red-500 mt-1">{endError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
