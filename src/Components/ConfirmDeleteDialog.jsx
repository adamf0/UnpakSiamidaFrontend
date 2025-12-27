import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function ConfirmDeleteDialog({
  open,
  title = "Hapus Data",
  message = "Data yang dihapus tidak dapat dikembalikan.",
  onConfirm,
  onClose,
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/40" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm bg-white rounded-lg shadow p-6">
            <Dialog.Title className="text-lg font-semibold mb-2">
              {title}
            </Dialog.Title>

            <p className="text-sm text-gray-600 mb-6">{message}</p>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-black"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                className="px-3 py-2 bg-red-600 text-white rounded"
              >
                Hapus
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
