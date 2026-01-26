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
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="grid grid-cols-2 gap-4">
        {/* === YA === */}
        <label
          className={`
            cursor-pointer rounded-xl border p-4 transition
            ${watchValue === "1"
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
              : "border-gray-300 hover:border-gray-400"}
          `}
        >
          <input
            type="radio"
            value="1"
            className="hidden"
            {...register(name, !disabled? {
              required: required ? `${label} wajib dipilih` : false,
            }: undefined)}
          />

          <div className="flex items-center gap-3">
            <div
              className={`
                h-4 w-4 rounded-full border flex items-center justify-center
                ${watchValue === "1"
                  ? "border-blue-500"
                  : "border-gray-400"}
              `}
            >
              {watchValue === "1" && (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>

            <div>
              <p className="font-medium text-sm">{yesLabel}</p>
              <p className="text-xs text-gray-500">{yesDesc}</p>
            </div>
          </div>
        </label>

        {/* === TIDAK === */}
        <label
          className={`
            cursor-pointer rounded-xl border p-4 transition
            ${watchValue === "0"
              ? "border-red-500 bg-red-50 ring-1 ring-red-400"
              : "border-gray-300 hover:border-gray-400"}
          `}
        >
          <input
            type="radio"
            value="0"
            className="hidden"
            {...register(name, {
              required: required ? `${label} wajib dipilih` : false,
            })}
          />

          <div className="flex items-center gap-3">
            <div
              className={`
                h-4 w-4 rounded-full border flex items-center justify-center
                ${watchValue === "0"
                  ? "border-red-500"
                  : "border-gray-400"}
              `}
            >
              {watchValue === "0" && (
                <div className="h-2 w-2 rounded-full bg-red-500" />
              )}
            </div>

            <div>
              <p className="font-medium text-sm">{noLabel}</p>
              <p className="text-xs text-gray-500">{noDesc}</p>
            </div>
          </div>
        </label>
      </div>

      {error?.message && (
        <p className="text-xs text-red-500 mt-2">{error.message}</p>
      )}
    </div>
  );
}
