import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import Toast from "@/Components/Toast";

const ToastContext = createContext({
  addToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children, className = "top-5 right-5" }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type = "info", message = "", duration = 4000) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now();

    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Render Toast Portal directly to document.body with max z-index */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="polite"
            className={`fixed flex flex-col gap-2.5 z-[9999999] pointer-events-none items-end max-w-full px-4 sm:px-0 ${className}`}
          >
            <AnimatePresence mode="popLayout">
              {toasts.map((toast) => (
                <Toast
                  key={toast.id}
                  type={toast.type}
                  message={toast.message}
                  duration={toast.duration}
                  onClose={() => removeToast(toast.id)}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};