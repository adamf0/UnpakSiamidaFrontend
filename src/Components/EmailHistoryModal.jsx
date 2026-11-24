import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import {
  Mail,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  X,
  Filter,
} from "lucide-react";
import { apiClient } from "@/Common/api";
import { useToast } from "@/Providers/ToastProvider";

export default function EmailHistoryModal({ open, onClose }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/users/email-history", {
        params: {
          search,
          status: statusFilter === "all" ? "" : statusFilter,
          page,
          limit: 15,
        },
      });
      const list = res?.data?.data || res?.data || [];
      const totalCount = res?.data?.total || 0;
      setData(list);
      setTotal(totalCount);
    } catch (err) {
      console.error("Fetch email history error:", err);
      addToast("error", "Gagal memuat riwayat pengiriman email");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setVerifyResult(null);
    }
  }, [open, page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleVerifyGoogle = async (item) => {
    if (!item?.id) return;
    setVerifyingId(item.id);
    try {
      const res = await apiClient.post(`/users/email-history/${item.id}/verify`);
      const r = res?.data || {};
      setVerifyResult({
        id: item.id,
        is_sent: r.is_sent,
        labels: r.labels || [],
        snippet: r.snippet || "",
        message_id: r.message_id || item.message_id,
      });
      addToast(
        r.is_sent ? "success" : "info",
        r.is_sent
          ? `Google API: Email terverifikasi ada di folder Terkirim (SENT)`
          : `Google API: Pesan ditemukan dengan label: ${(r.labels || []).join(", ")}`
      );
    } catch (err) {
      console.error("Verify email error:", err);
      const msg = err?.response?.data?.message || err?.message || "Gagal verifikasi dengan Google API";
      addToast("error", msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Transition appear show={Boolean(open)} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-gray-100 transition-all">
                {/* HEADER */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Mail size={20} />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-gray-900">
                        Riwayat & Verifikasi Pengiriman Email
                      </Dialog.Title>
                      <p className="text-xs text-gray-500">
                        Data riwayat pengiriman via Outbox Pattern & integrasi Google SMTP
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* FILTER & SEARCH */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                  <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari email / username / outbox ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </form>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs">
                      {[
                        { id: "all", label: "Semua" },
                        { id: "SENT", label: "Terkirim" },
                        { id: "SENDING", label: "Mengirim" },
                        { id: "PENDING", label: "Antrean" },
                        { id: "FAILED", label: "Gagal" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setStatusFilter(tab.id);
                            setPage(1);
                          }}
                          className={`px-3 py-1 font-medium rounded-lg transition cursor-pointer ${
                            statusFilter === tab.id
                              ? "bg-white text-indigo-600 shadow-xs font-semibold"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => fetchData()}
                      disabled={loading}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-xl transition cursor-pointer"
                      title="Muat Ulang"
                    >
                      <RotateCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                {/* VERIFY BANNER IF ANY */}
                {verifyResult && (
                  <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start justify-between gap-3 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>Status Terverifikasi Live dari Google SMTP</span>
                          {verifyResult.is_sent && (
                            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px]">
                              SENT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Google Message ID: <span className="font-mono">{verifyResult.message_id}</span>
                          {verifyResult.labels?.length > 0 && (
                            <> · Labels: [{verifyResult.labels.join(", ")}]</>
                          )}
                        </p>
                        {verifyResult.snippet && (
                          <p className="text-[11px] text-gray-500 italic mt-1 line-clamp-1">
                            "{verifyResult.snippet}"
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVerifyResult(null)}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* TABLE LIST */}
                <div className="mt-3.5 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Penerima</th>
                          <th className="py-2.5 px-3">Subjek & Provider</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Verifikasi Google</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loading && data.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-400">
                              <div className="flex items-center justify-center gap-2">
                                <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                                <span>Memuat riwayat email...</span>
                              </div>
                            </td>
                          </tr>
                        ) : data.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-400">
                              Belum ada data riwayat pengiriman email
                            </td>
                          </tr>
                        ) : (
                          data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/70 transition">
                              <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                                {formatDate(item.sent_at || item.created_at)}
                              </td>
                              <td className="py-2.5 px-3 min-w-44">
                                <div className="font-semibold text-gray-800">
                                  {item.username || "User"}
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono">
                                  {item.recipient_email}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 max-w-xs">
                                <div className="font-medium text-gray-800 truncate" title={item.subject}>
                                  {item.subject}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      item.provider === "GOOGLE_SMTP" || item.provider === "GMAIL_API"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                  >
                                    {item.provider === "GMAIL_API" ? "Google SMTP" : (item.provider || "SMTP")}
                                  </span>
                                  {item.message_id && (
                                    <span
                                      className="text-[10px] text-gray-400 font-mono truncate max-w-32"
                                      title={item.message_id}
                                    >
                                      ID: {item.message_id.slice(0, 12)}...
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {item.status === "SENT" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle size={12} />
                                    <span>Terkirim</span>
                                  </span>
                                )}
                                {item.status === "SENDING" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <RotateCw size={12} className="animate-spin" />
                                    <span>Mengirim</span>
                                  </span>
                                )}
                                {item.status === "PENDING" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={12} />
                                    <span>Antrean</span>
                                  </span>
                                )}
                                {item.status === "FAILED" && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                                    title={item.error_message || "Gagal"}
                                  >
                                    <AlertCircle size={12} />
                                    <span>Gagal</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {item.message_id ? (
                                  <button
                                    type="button"
                                    disabled={verifyingId === item.id}
                                    onClick={() => handleVerifyGoogle(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition cursor-pointer disabled:opacity-50"
                                    title="Cek status live langsung ke server Google"
                                  >
                                    {verifyingId === item.id ? (
                                      <>
                                        <RotateCw size={12} className="animate-spin" />
                                        <span>Cek...</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck size={12} />
                                        <span>Cek Google</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FOOTER & PAGINATION */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Total: <b className="text-gray-800">{total}</b> riwayat email
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    <span className="px-2">Hal. {page}</span>
                    <button
                      type="button"
                      disabled={data.length < 15 || page * 15 >= total || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
