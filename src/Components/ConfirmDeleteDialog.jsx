import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDeleteDialog({
  open,
  isOpen,
  title = "Konfirmasi Hapus Data",
  message = "Data yang dihapus tidak dapat dikembalikan. Pastikan Anda telah memeriksa kembali sebelum melanjutkan.",
  description,
  entityName,
  itemTitle,
  confirmText = "Hapus Data",
  cancelText = "Batal, Kembali",
  loading = false,
  onConfirm,
  onClose,
}) {
  const show = Boolean(open ?? isOpen ?? false);
  const text = description || message;
  const targetEntity = entityName || itemTitle;

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={loading ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl border border-gray-100 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle size={24} strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg font-bold text-gray-900 leading-snug">
                      {title}
                    </Dialog.Title>

                    {targetEntity && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-200/80 text-xs font-semibold text-gray-800 break-words">
                        {targetEntity}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">
                      {text}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300/50 cursor-pointer"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
