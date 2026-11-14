/* Hallmark · component: access-block-card · genre: modern-minimal · theme: clean-superapp · states: 8 · contrast: pass · v2.0.0 */
import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  User,
  Building2,
  ArrowLeft,
  RefreshCw,
  Lock,
  Lightbulb,
} from "lucide-react";

/**
 * Grab / Gojek style Access Block Page Card
 * Designed with approachable super-app aesthetic, high clarity, and tactile actions.
 */
export default function ProkerAccessBlockCard({
  curRole = "",
  activeRoleUnit = null,
  accessBlockInfo = null,
  onBack,
  backLabel = "Kembali ke daftar program kerja",
  onChangeLevel,
  changeLevelLabel = "Ganti level atau unit",
}) {
  const currentRoleUpper = String(curRole || "").toUpperCase();
  const currentUnitName = activeRoleUnit?.name ? `(${activeRoleUnit.name})` : "";
  const targetUnitName =
    accessBlockInfo?.proker?.NamaFakultasUnit ||
    accessBlockInfo?.targetUnit ||
    "Unit lain (di luar penugasan)";
  const programName =
    accessBlockInfo?.proker?.NamaProgram ||
    accessBlockInfo?.proker?.nama_program ||
    null;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto my-8 motion-safe:animate-in motion-safe:fade-in motion-reduce:transform-none duration-200">
      {/* Grab / Gojek Layered Emblem Halo */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5 relative">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-xs border border-rose-100 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
        </div>
        <div className="w-6 h-6 rounded-full bg-white shadow-2xs border border-rose-200 flex items-center justify-center absolute -top-1 -right-1 text-rose-500">
          <Lock className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Pill Badge (Sentence case, clean) */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        <span>Akses dibatasi</span>
      </div>

      {/* Headline */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2.5 tracking-tight">
        {accessBlockInfo?.title || "Bukan unit penugasan Anda"}
      </h2>

      {/* Friendly Description */}
      <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed mb-6 font-normal">
        {programName ? (
          <>
            Program kerja <strong className="text-slate-900 font-semibold">"{programName}"</strong> berada di bawah wewenang unit <strong className="text-slate-900 font-semibold">{targetUnitName}</strong>. Akun Anda saat ini aktif dengan wewenang <strong className="text-slate-900 font-semibold">{currentRoleUpper} {currentUnitName}</strong>.
          </>
        ) : (
          <>
            Anda sedang aktif dengan wewenang <strong className="text-slate-900 font-semibold">{currentRoleUpper} {currentUnitName}</strong>, sedangkan data ini berada di bawah wewenang unit <strong className="text-slate-900 font-semibold">{targetUnitName}</strong>.
          </>
        )}
      </p>

      {/* Grab / Gojek Connected Route & Scope Ticket */}
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

        {/* Row 2: Target Unit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium block">
                Unit pemilik kegiatan
              </span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                {targetUnitName}
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-200 shrink-0">
            Perlu izin unit
          </span>
        </div>
      </div>
      
    </div>
  );
}
