import React from "react";

const TextInput = React.forwardRef(
  ({ label, error, required, className = "", type = "text", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          {...props}
          className={`
            w-full px-3 py-2 text-sm rounded border
            outline-none transition
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500 focus:ring-2 focus:ring-red-400 focus:border-red-500"
                : "border-gray-300 focus:ring-2 focus:ring-purple-600"
            }
            ${className}
          `}
        />

        {(typeof error === "string" ? error : error?.message) && (
          <p className="text-xs text-red-500 mt-1">
            {typeof error === "string" ? error : error.message}
          </p>
        )}
      </div>
    );
  }
);


TextInput.displayName = "TextInput";
export default TextInput;
