import React from "react";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Banner penanda bahwa halaman / fitur dinonaktifkan oleh developer
 * karena variabel konfigurasi VITE_HIDE_NON_V3_ACTIONS sedang aktif.
 */
const PageDisabledBanner = ({
  title = "halaman ini di matikan oleh developer",
  message = "Akses formulir dan aksi perubahan data pada halaman ini dinonaktifkan karena belum migrasi data.",
  showBackButton = true,
  className = "",
}) => {
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      className={`p-4 bg-amber-50/95 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="stroke-[2.2]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-amber-950 leading-tight">
            {title}
          </h4>
          {message && (
            <p className="text-xs text-amber-800/90 mt-0.5 leading-normal">
              {message}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 border border-amber-300/80 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={13} />
            <span>Kembali</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PageDisabledBanner;
