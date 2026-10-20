import React, { useEffect, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { apiClient } from "@/Common/api";
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  FileEdit,
  DollarSign,
  ShieldCheck,
  User,
  ArrowRight,
  RefreshCw,
  Calendar,
} from "lucide-react";

const parseFormattedDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " WIB";
  } catch (e) {
    return String(dateStr);
  }
};

const getRoleBadge = (role) => {
  const r = String(role || "").toLowerCase().trim();
  switch (r) {
    case "anggaran":
    case "keuangan":
      return {
        label: r.toUpperCase(),
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "upml":
      return {
        label: "UPML",
        bg: "bg-cyan-50 text-cyan-800 border-cyan-200",
      };
    case "upmf":
      return {
        label: "UPMF",
        bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
      };
    case "upms":
    case "evaluator":
      return {
        label: r === "evaluator" ? "EVALUATOR" : "UPMS",
        bg: "bg-purple-50 text-purple-800 border-purple-200",
      };
    case "admin":
      return {
        label: "ADMIN",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
      };
    default:
      return {
        label: r ? r.toUpperCase() : "PENGUSUL",
        bg: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
};

const getStateConfig = (stateStr) => {
  const s = String(stateStr || "").toLowerCase().replace(/_/g, " ").trim();

  if (s.includes("tolak")) {
    let label = "Ditolak";
    if (s.includes("verif")) {
      label = "Ditolak Verifikator";
    } else if (s.includes("anggar") || s.includes("keuangan")) {
      label = "Ditolak Anggaran";
    }
    return {
      label,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      iconBg: "bg-rose-600 text-white ring-rose-100",
      icon: <XCircle className="w-4 h-4" />,
      isReject: true,
    };
  }

  if (s === "terima anggaran" || s.includes("terima anggar")) {
    return {
      label: "Terima Anggaran",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      iconBg: "bg-emerald-600 text-white ring-emerald-100",
      icon: <DollarSign className="w-4 h-4" />,
      isComplete: true,
    };
  }

  if (
    s === "terima verifikator" ||
    s.includes("terima verif") ||
    s === "disetujui" ||
    s.includes("diverifikasi")
  ) {
    return {
      label: "Terima Verifikator",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
      iconBg: "bg-indigo-600 text-white ring-indigo-100",
      icon: <ShieldCheck className="w-4 h-4" />,
    };
  }

  if (s === "diajukan" || s.includes("ajukan")) {
    return {
      label: "Diajukan",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
      iconBg: "bg-blue-600 text-white ring-blue-100",
      icon: <Send className="w-3.5 h-3.5" />,
    };
  }

  return {
    label: "Draf Awal",
    badgeColor: "bg-gray-100 text-gray-700 border-gray-300",
    iconBg: "bg-gray-500 text-white ring-gray-100",
    icon: <FileEdit className="w-3.5 h-3.5" />,
  };
};

export default function StateHistoryDrawer({
  isOpen,
  onClose,
  entityUuid,
  title = "Program Kerja",
  subtitle = "Riwayat Status & Verifikasi",
}) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!entityUuid) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/proker_v3/${entityUuid}/history`);
      const items = res?.data?.data || res?.data || [];
      setHistoryList(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Gagal memuat riwayat status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && entityUuid) {
      fetchHistory();
    } else {
      setHistoryList([]);
      setError(null);
    }
  }, [isOpen, entityUuid]);

  const getNormState = (h) =>
    String(h?.to_state || h?.ToState || h?.action || h?.Action || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .trim();

  // Determine stage progression
  const hasSubmitted = historyList.some((h) => {
    const s = getNormState(h);
    return [
      "diajukan",
      "ajukan",
      "terima verifikator",
      "ditolak verifikator",
      "terima anggaran",
      "ditolak anggaran",
      "disetujui",
      "diverifikasi",
    ].some((k) => s.includes(k));
  });

  const hasVerifierApproved = historyList.some((h) => {
    const s = getNormState(h);
    return (
      s.includes("terima verifikator") ||
      s.includes("terima verif") ||
      s === "disetujui" ||
      s.includes("diverifikasi") ||
      s.includes("anggar")
    );
  });

  const isVerifierRejected = historyList.some((h) => {
    const s = getNormState(h);
    return s.includes("tolak") && s.includes("verif");
  });

  const hasAnggaranApproved = historyList.some((h) => {
    const s = getNormState(h);
    return s.includes("terima anggaran") || s.includes("terima anggar");
  });

  const isAnggaranRejected = historyList.some((h) => {
    const s = getNormState(h);
    return (
      (s.includes("tolak") && s.includes("anggar")) ||
      (s.includes("tolak") && !s.includes("verif") && hasVerifierApproved)
    );
  });

  return (
    <Transition appear show={Boolean(isOpen)} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-gray-200">
                  {/* HEADER */}
                  <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" />
                          <span>History</span>
                        </div>
                        <Dialog.Title className="text-base font-bold text-gray-900 line-clamp-2">
                          {title || "Program Kerja"}
                        </Dialog.Title>
                        <p className="text-xs text-gray-500 line-clamp-1">{subtitle}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={fetchHistory}
                          disabled={loading}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                          title="Muat ulang riwayat"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                          title="Tutup sidebar"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Step Indicator (Summary) */}
                    <div className="mt-4 pt-3 border-t border-purple-100/80">
                      <div className="text-[11px] font-semibold text-gray-600 mb-2">
                        Alur Validasi:
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div
                          className={`px-1.5 py-1 rounded border text-[10px] font-bold ${
                            historyList.length > 0
                              ? "bg-gray-100 text-gray-800 border-gray-300"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          1. Draf
                        </div>
                        <div
                          className={`px-1.5 py-1 rounded border text-[10px] font-bold ${
                            hasSubmitted
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          2. Diajukan
                        </div>
                        <div
                          className={`px-1.5 py-1 rounded border text-[10px] font-bold ${
                            isVerifierRejected
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : hasVerifierApproved
                              ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          3. Verifikator
                        </div>
                        <div
                          className={`px-1.5 py-1 rounded border text-[10px] font-bold ${
                            isAnggaranRejected
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : hasAnggaranApproved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          4. Anggaran
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BODY: VERTICAL TIMELINE */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-48 space-y-3">
                        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        <p className="text-xs text-gray-500">Memuat data riwayat state...</p>
                      </div>
                    ) : error ? (
                      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
                        <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                        <p className="text-xs text-rose-700 font-medium">{error}</p>
                        <button
                          type="button"
                          onClick={fetchHistory}
                          className="px-3 py-1 bg-white border border-rose-300 text-xs text-rose-700 font-bold rounded-lg shadow-2xs hover:bg-rose-100 transition cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    ) : historyList.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Clock className="w-10 h-10 text-gray-300 mx-auto" />
                        <h4 className="text-sm font-bold text-gray-700">Belum Ada Riwayat</h4>
                        <p className="text-xs text-gray-500 max-w-xs mx-auto">
                          Item ini belum memiliki catatan transisi state status pada database.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6">
                        {/* Timeline continuous vertical connecting line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200" />

                        <div className="space-y-6">
                          {historyList.map((item, idx) => {
                            const toState =
                              item.to_state || item.ToState || item.action || item.Action || "";
                            const fromState = item.from_state || item.FromState || "";
                            const role = item.role || item.Role || "";
                            const userName =
                              item.user_name ||
                              item.UserName ||
                              item.actor_name ||
                              item.ActorName ||
                              "Sistem";
                            const catatan = item.catatan || item.Catatan || "";
                            const createdAt = item.created_at || item.CreatedAt;

                            const config = getStateConfig(toState);
                            const roleBadge = getRoleBadge(role);

                            return (
                              <div key={item.uuid || item.UUID || item.id || idx} className="relative group">
                                {/* Dot / Icon on timeline */}
                                <div
                                  className={`absolute -left-[27px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 shadow-sm z-10 transition-transform group-hover:scale-110 ${config.iconBg}`}
                                  title={config.label}
                                >
                                  {config.icon}
                                </div>

                                {/* Step Content Card */}
                                <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs hover:shadow-sm hover:border-purple-200 transition p-3.5 space-y-2.5">
                                  {/* Step Top Row: State Label & Timestamp */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${config.badgeColor}`}
                                      >
                                        {config.label}
                                      </span>

                                      {/* Transition Badge from -> to */}
                                      {fromState && fromState !== "-" && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                          <span>{fromState}</span>
                                          <ArrowRight className="w-3 h-3 text-gray-400" />
                                          <span className="font-bold text-gray-700">{toState}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[11px] font-medium text-gray-600 flex items-center gap-1 justify-end">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span>{parseFormattedDate(createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* User & Role info */}
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                      <User className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="font-semibold text-gray-800 line-clamp-1">
                                        {userName}
                                      </span>
                                    </div>

                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.bg}`}
                                    >
                                      {roleBadge.label}
                                    </span>
                                  </div>

                                  {/* Rejection / Note Callout */}
                                  {catatan && (
                                    <div
                                      className={`p-2.5 rounded-lg text-xs border ${
                                        config.isReject
                                          ? "bg-rose-50/70 border-rose-200 text-rose-800"
                                          : "bg-amber-50/70 border-amber-200 text-amber-900"
                                      }`}
                                    >
                                      <div className="font-bold text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                        {config.isReject ? (
                                          <>
                                            <AlertCircle className="w-3 h-3 text-rose-600" />
                                            <span>Alasan Penolakan:</span>
                                          </>
                                        ) : (
                                          <span>Catatan:</span>
                                        )}
                                      </div>
                                      <p className="italic text-gray-700 whitespace-pre-wrap break-words">
                                        "{catatan}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                    <span className="text-xs text-gray-500">
                      Total: <b>{historyList.length}</b> catatan transisi
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
