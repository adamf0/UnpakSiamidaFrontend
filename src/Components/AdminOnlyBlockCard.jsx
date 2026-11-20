/* Hallmark · component: admin-only-block-card · genre: modern-minimal · theme: clean-superapp */
import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  User,
  Shield,
  LayoutDashboard,
  ClipboardList,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminOnlyBlockCard({
  pageTitle = "Halaman",
  curRole = "",
  activeRoleUnit = null,
  onChangeLevel = null,
}) {
  const navigate = useNavigate();
  const currentRoleUpper = String(curRole || "").toUpperCase();
  const currentUnitName = activeRoleUnit?.name ? `(${activeRoleUnit.name})` : "";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto my-8 motion-safe:animate-in motion-safe:fade-in motion-reduce:transform-none duration-200">
      {/* Layered Emblem Halo */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5 relative">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-xs border border-rose-100 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
        </div>
        <div className="w-6 h-6 rounded-full bg-white shadow-2xs border border-rose-200 flex items-center justify-center absolute -top-1 -right-1 text-rose-500">
          <Lock className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        <span>Akses Terbatas: Khusus Administrator</span>
      </div>

      {/* Headline */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2.5 tracking-tight">
        Akses Ditolak
      </h2>

      {/* Friendly Description */}
      <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed mb-6 font-normal">
        Halaman <strong className="text-slate-900 font-semibold">{pageTitle}</strong> hanya dapat diakses dan dikelola oleh <strong className="text-slate-900 font-semibold">Administrator Universitas</strong>. Akun Anda saat ini aktif dengan peran <strong className="text-slate-900 font-semibold">{currentRoleUpper} {currentUnitName}</strong>.
      </p>

      {/* Scope Ticket */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 sm:p-5 max-w-lg mx-auto mb-7 text-left shadow-2xs">
        {/* Row 1: Active Role */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium block">
                Peran aktif Anda
              </span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                {currentRoleUpper} {currentUnitName}
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100/90 text-purple-800 border border-purple-200 shrink-0">
            Sedang aktif
          </span>
        </div>

        {/* Row 2: Required Level */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium block">
                Wewenang yang dibutuhkan
              </span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                Administrator (Admin)
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-200 shrink-0">
            Wajib Admin
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm shadow-xs transition hover:shadow cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Ke Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/proker_v3")}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition cursor-pointer"
        >
          <ClipboardList className="w-4 h-4 text-slate-500" />
          <span>Program Kerja</span>
        </button>

        {onChangeLevel && (
          <button
            type="button"
            onClick={onChangeLevel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition cursor-pointer"
          >
            <span>Ganti Level</span>
          </button>
        )}
      </div>
    </div>
  );
}
