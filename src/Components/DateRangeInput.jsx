import React from "react";

export default function DateRangeInput({
  label,
  required = false,
  disabled = false,
  start,
  end,
  startError,
  endError,
}) {
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1">
          <input
            type="date"
            disabled={disabled}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white shadow-2xs outline-none transition-all duration-150 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              ${
                startError
                  ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                  : "border-gray-300 hover:border-gray-400 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15 text-gray-900"
              }`}
            {...start}
          />
          {startError && (
            <p className="text-xs font-medium text-rose-600 mt-1">{startError}</p>
          )}
        </div>

        <div className="flex-1">
          <input
            type="date"
            disabled={disabled}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white shadow-2xs outline-none transition-all duration-150 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              ${
                endError
                  ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                  : "border-gray-300 hover:border-gray-400 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15 text-gray-900"
              }`}
            {...end}
          />
          {endError && (
            <p className="text-xs font-medium text-rose-600 mt-1">{endError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
