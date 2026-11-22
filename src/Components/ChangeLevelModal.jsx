import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { getRoleBaseName, getRoleTargetUnits } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { ShieldCheck, Check, X, Building2, Calendar } from "lucide-react";

const getRoleDescription = (roleKey) => {
  const low = String(roleKey || "").toLowerCase();
  switch (low) {
    case "admin":
      return "Akses administrator seluruh sistem & universitas";
    case "auditee":
      return "Akses pengisian dan tindak lanjut temuan audit";
    case "auditor1":
      return "Akses verifikasi audit sebagai Auditor Utama";
    case "auditor2":
      return "Akses verifikasi audit sebagai Auditor Pendamping";
    case "fakultas":
      return "Akses penjaminan mutu tingkat fakultas";
    case "anggaran":
    case "keuangan":
      return "Akses verifikasi alokasi anggaran & keuangan";
    case "evaluator":
      return "Akses evaluasi dan verifikasi program kerja";
    case "upml":
      return "Akses unit penjaminan mutu lembaga / unit";
    case "upmf":
      return "Akses unit penjaminan mutu fakultas";
    case "upms":
      return "Akses unit penjaminan mutu program studi / sekolah";
    case "user":
      return "Akses akun pengguna unit kerja dasar";
    default:
      return "Hak akses peran standar";
  }
};

const ChangeLevelModal = ({
  open,
  onClose,
  levels = [],
  listLevel,
  currentLevel,
  level,
  user: propUser,
  positionYear: propYear,
  unitOptions,
  onSubmit,
  setLevel,
  setOpen,
}) => {
  const { user: authUser } = useAuth() || {};
  const { positionYear: contentYear } = useContent() || {};
  const user = propUser || authUser;
  const positionYear = propYear || contentYear;

  const [internalUnitOptions, setInternalUnitOptions] = useState(unitOptions || []);

  useEffect(() => {
    if (Array.isArray(unitOptions) && unitOptions.length > 0) {
      setInternalUnitOptions(unitOptions);
      return;
    }
    let cancel = false;
    apiClient
      .get("/fakultasunits?mode=all&include_hidden=true")
      .then((res) => {
        if (!cancel && Array.isArray(res?.data)) {
          setInternalUnitOptions(res.data);
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [unitOptions]);

  const effectiveUnitOptions =
    Array.isArray(unitOptions) && unitOptions.length > 0
      ? unitOptions
      : internalUnitOptions;

  const actualLevels =
    Array.isArray(levels) && levels.length > 0
      ? levels
      : Array.isArray(listLevel)
      ? listLevel
      : [];
  const actualCurrentLevel = currentLevel || level;
  const handleClose = onClose || (() => setOpen?.(false));
  const handleSubmit =
    onSubmit ||
    ((lvl) => {
      setLevel?.(lvl);
      handleClose();
    });

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-gray-150">
          <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-gray-900">
                  Ganti Hak Akses / Peran
                </Dialog.Title>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pilih peran aktif Anda untuk menyesuaikan wewenang dan data unit
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {actualLevels.map((lvl) => {
              const isSelected = lvl === actualCurrentLevel;
              const baseName = getRoleBaseName(lvl);
              const roleUnits = getRoleTargetUnits(
                lvl,
                user,
                positionYear,
                effectiveUnitOptions
              );
              const fullTooltip =
                roleUnits.length > 0
                  ? `${baseName} (${roleUnits.join(", ")})`
                  : `${baseName} - ${getRoleDescription(lvl)}`;

              return (
                <div
                  key={lvl}
                  onClick={() => handleSubmit(lvl)}
                  className={`group relative flex flex-col gap-2 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-purple-50/70 border-purple-500 ring-2 ring-purple-600/15 text-purple-950 shadow-2xs"
                      : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 text-gray-800"
                  }`}
                  title={fullTooltip}
                >
                  {/* Baris Utama: Radio indicator, Role Title, Badge Jumlah Unit, Badge Aktif */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "border-purple-600 bg-purple-600 text-white"
                            : "border-gray-400 bg-white group-hover:border-purple-400"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-purple-950">
                          {baseName}
                        </span>
                        {roleUnits.length > 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                            {roleUnits.length} Unit Ditugaskan
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-purple-600 text-white rounded-md shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Baris Target: Chip unit-unit penugasan atau deskripsi peran */}
                  {roleUnits.length > 0 ? (
                    <div className="pl-6.5 flex flex-wrap items-center gap-1.5">
                      {roleUnits.slice(0, 2).map((u) => (
                        <span
                          key={u}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs truncate max-w-[210px]"
                          title={u}
                        >
                          <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate">{u}</span>
                        </span>
                      ))}
                      {roleUnits.length > 2 && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100/70 text-purple-800 border border-purple-200 cursor-help"
                          title={roleUnits.slice(2).join(", ")}
                        >
                          +{roleUnits.length - 2} lainnya
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pl-6.5 text-xs text-gray-500">
                      {getRoleDescription(lvl)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Tahun Penugasan:{" "}
                <strong className="text-gray-700 font-semibold">
                  {positionYear || "-"}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChangeLevelModal;
