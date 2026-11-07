import React from "react";

const TextInput = React.forwardRef(
  ({ label, error, required, className = "", type = "text", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          {...props}
          className={`
            w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white shadow-2xs
            outline-none transition-all duration-150
            placeholder:text-gray-400
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15 bg-rose-50/20 text-rose-950"
                : "border-gray-300 hover:border-gray-400 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15 text-gray-900"
            }
            ${className}
          `}
        />

        {(typeof error === "string" ? error : error?.message) && (
          <p className="text-xs font-medium text-rose-600 mt-1.5 flex items-center gap-1">
            <span>{typeof error === "string" ? error : error.message}</span>
          </p>
        )}
      </div>
    );
  }
);


TextInput.displayName = "TextInput";
export default TextInput;
