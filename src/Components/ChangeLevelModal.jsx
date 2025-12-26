import { mappedText } from "@/Common/Utils";
import { Dialog } from "@headlessui/react";

const ChangeLevelModal = ({
  open,
  onClose,
  levels,
  currentLevel,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-xl p-6">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Change Role
          </Dialog.Title>

          <div className="space-y-3">
            {levels.map((lvl) => (
              <label key={lvl} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={lvl === currentLevel}
                  onChange={() => onSubmit(lvl)}
                />
                <span className="capitalize">{mappedText(lvl)}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChangeLevelModal;
