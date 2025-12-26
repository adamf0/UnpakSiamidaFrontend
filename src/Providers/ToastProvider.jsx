import React, { createContext, useContext, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Toast from "@/Components/Toast";
import { v4 as uuidv4 } from "uuid";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children, className="top-20 right-5" }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message, duration = 3000) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Stack Toast */}
      <div className={`fixed flex flex-col gap-3 z-[9999] ${className}`}>
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              type={toast.type}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};