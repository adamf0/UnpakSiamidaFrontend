import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    title: "Berhasil",
    badgeBg: "bg-emerald-100 text-emerald-600",
    borderLeft: "border-l-emerald-500",
    progressBar: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    title: "Gagal",
    badgeBg: "bg-rose-100 text-rose-600",
    borderLeft: "border-l-rose-500",
    progressBar: "bg-rose-500",
  },
  errors: {
    icon: AlertCircle,
    title: "Gagal",
    badgeBg: "bg-rose-100 text-rose-600",
    borderLeft: "border-l-rose-500",
    progressBar: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    title: "Peringatan",
    badgeBg: "bg-amber-100 text-amber-600",
    borderLeft: "border-l-amber-500",
    progressBar: "bg-amber-500",
  },
  warn: {
    icon: AlertTriangle,
    title: "Peringatan",
    badgeBg: "bg-amber-100 text-amber-600",
    borderLeft: "border-l-amber-500",
    progressBar: "bg-amber-500",
  },
  info: {
    icon: Info,
    title: "Informasi",
    badgeBg: "bg-blue-100 text-blue-600",
    borderLeft: "border-l-blue-500",
    progressBar: "bg-blue-500",
  },
};

export default function Toast({
  type = "info",
  message,
  duration = 4000,
  onClose,
}) {
  const normType = String(type || "info").toLowerCase().trim();
  const cfg = TOAST_TYPES[normType] || TOAST_TYPES.info;
  const Icon = cfg.icon;

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!duration || duration <= 0 || isPaused) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, isPaused, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full sm:w-[360px] md:w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-gray-100 border-l-[5px] ${cfg.borderLeft}`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${cfg.badgeBg}`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {cfg.title}
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs sm:text-[13px] font-semibold text-gray-800 leading-snug mt-0.5 break-words">
            {message}
          </p>
        </div>
      </div>

      {duration > 0 && !isPaused && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`h-1 w-full ${cfg.progressBar} opacity-80`}
        />
      )}
    </motion.div>
  );
}