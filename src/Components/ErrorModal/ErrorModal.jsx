import React from "react";

const ErrorModal = ({ modal, onClose }) => {
  if (!modal.open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-[400px] shadow-lg animate-fadeIn">
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h5 className="flex-1 text-lg font-semibold text-center">{modal.title}</h5>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="px-4 py-3 whitespace-pre-line text-sm text-gray-700">
          {modal.message}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button
            className="px-4 py-2 rounded text-red-500"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
