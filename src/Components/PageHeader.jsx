import React from "react";

const PageHeader = ({
  icon: Icon,
  title,
  subtitle,
  actions = null,
  className = "",
}) => {
  return (
    <div
      className={`bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PageHeader;
