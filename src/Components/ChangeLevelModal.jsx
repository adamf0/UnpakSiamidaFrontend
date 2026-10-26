import { mappedText } from "@/Common/Utils";
import { Dialog } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";

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
      <div className="fixed inset-0 bg-black/40" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl border border-gray-100">
          <Dialog.Title className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Change Role
          </Dialog.Title>

          <div className="space-y-3">
            {actualLevels.map((lvl) => (
              <label key={lvl} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-purple-50/60 cursor-pointer transition">
                <input
                  type="radio"
                  name="role-level"
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  checked={lvl === actualCurrentLevel}
                  onChange={() => handleSubmit(lvl)}
                />
                <span className="text-sm font-medium text-gray-800">
                  {mappedText(lvl, user, positionYear, unitOptions)}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm font-medium text-white rounded-xl shadow-xs transition cursor-pointer"
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
