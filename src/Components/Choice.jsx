import React from "react";

export default function Choice({
  name,
  label,
  register,
  error,
  required = false,
  disabled= false,
  watchValue,
  yesLabel = "Ya",
  noLabel = "Tidak",
  yesDesc = "Menyetujui / Berlaku",
  noDesc = "Ditolak / Tidak berlaku",
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>

      <div className="grid grid-cols-2 gap-3.5">
        {/* === YA === */}
        <label
          className={`
            ${disabled ? "cursor-default opacity-80" : "cursor-pointer"} rounded-xl border p-3.5 transition-all
            ${watchValue === "1"
              ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20 text-purple-950 shadow-2xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 text-gray-800"}
          `}
        >
          <input
            type="radio"
            value="1"
            disabled={disabled}
            className="hidden"
            {...register(name, !disabled ? {
              required: required ? `${label} wajib dipilih` : false,
            } : undefined)}
          />

          <div className="flex items-center gap-3">
            <div
              className={`
                h-4 w-4 rounded-full border flex items-center justify-center shrink-0
                ${watchValue === "1"
                  ? "border-purple-600 bg-white"
                  : "border-gray-400"}
              `}
            >
              {watchValue === "1" && (
                <div className="h-2 w-2 rounded-full bg-purple-600" />
              )}
            </div>

            <div>
              <p className="font-semibold text-sm">{yesLabel}</p>
              <p className="text-xs text-gray-500">{yesDesc}</p>
            </div>
          </div>
        </label>

        {/* === TIDAK === */}
        <label
          className={`
            ${disabled ? "cursor-default opacity-80" : "cursor-pointer"} rounded-xl border p-3.5 transition-all
            ${watchValue === "0"
              ? "border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 text-rose-950 shadow-2xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 text-gray-800"}
          `}
        >
          <input
            type="radio"
            value="0"
            disabled={disabled}
            className="hidden"
            {...register(name, !disabled ? {
              required: required ? `${label} wajib dipilih` : false,
            } : undefined)}
          />

          <div className="flex items-center gap-3">
            <div
              className={`
                h-4 w-4 rounded-full border flex items-center justify-center shrink-0
                ${watchValue === "0"
                  ? "border-rose-500 bg-white"
                  : "border-gray-400"}
              `}
            >
              {watchValue === "0" && (
                <div className="h-2 w-2 rounded-full bg-rose-500" />
              )}
            </div>

            <div>
              <p className="font-semibold text-sm">{noLabel}</p>
              <p className="text-xs text-gray-500">{noDesc}</p>
            </div>
          </div>
        </label>
      </div>

      {error?.message && (
        <p className="text-xs font-medium text-rose-600 mt-2">{error.message}</p>
      )}
    </div>
  );
}
