import { mappedText } from "@/Common/Utils";
import { Dialog } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { ShieldCheck, Check, X } from "lucide-react";

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

  const actualLevels = Array.isArray(levels) && levels.length > 0
    ? levels
    : (Array.isArray(listLevel) ? listLevel : []);
  const actualCurrentLevel = currentLevel || level;
  const handleClose = onClose || (() => setOpen?.(false));
  const handleSubmit = onSubmit || ((lvl) => {
    setLevel?.(lvl);
    handleClose();
  });

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-150">
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
                  Pilih peran aktif Anda untuk menyesuaikan wewenang
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
              return (
                <div
                  key={lvl}
                  onClick={() => handleSubmit(lvl)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-purple-50/70 border-purple-500 ring-2 ring-purple-600/15 text-purple-950 font-semibold shadow-2xs"
                      : "bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-gray-400 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm truncate">
                      {mappedText(lvl, user, positionYear, unitOptions)}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="px-2 py-0.5 text-2xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md border border-purple-200 shrink-0">
                      Aktif
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
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
