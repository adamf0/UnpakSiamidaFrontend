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
      className={`bg-white px-6 py-5 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon size={22} strokeWidth={1.8} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
