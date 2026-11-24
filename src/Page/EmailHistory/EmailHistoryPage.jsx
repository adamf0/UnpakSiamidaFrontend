import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertTriangle,
  RefreshCw,
  Info,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import { apiClient, API_BASE_URL, getValidToken } from "@/Common/api";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";

export default function EmailHistoryPage() {
  const { addToast } = useToast();
  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Status counters for summary badges
  const [stats, setStats] = useState({
    sent: 0,
    pending: 0,
    failed: 0,
  });
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/users/email-history", {
        params: {
          search,
          status: statusFilter === "all" ? "" : statusFilter,
          page,
          limit,
        },
      });
      const list = res?.data?.data || res?.data || [];
      const totalCount = res?.data?.total || 0;
      setData(Array.isArray(list) ? list : []);
      setTotal(totalCount);

      // Simple stats calculation from current dataset
      if (statusFilter === "all" && Array.isArray(list)) {
        let sent = 0;
        let pending = 0;
        let failed = 0;
        list.forEach((item) => {
          const st = String(item.status || "").toUpperCase();
          if (st === "SENT") sent++;
          else if (st === "FAILED") failed++;
          else pending++;
        });
        setStats({ sent, pending, failed });
      }
    } catch (err) {
      console.error("Fetch email history error:", err);
      addToast("error", "Gagal memuat riwayat pengiriman email");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, limit, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // LIVE REALTIME LISTENER (WebSocket with automatic SSE fallback)
  useEffect(() => {
    let ws = null;
    let sse = null;
    let reconnectTimer = null;
    let isCleanedUp = false;

    const handleLiveEvent = (payload) => {
      if (!payload) return;

      if (payload.type === "EMAIL_STATUS_UPDATE") {
        setData((prevList) => {
          let matched = false;
          const nextList = prevList.map((item) => {
            const isMatch =
              (payload.id && item.id === payload.id) ||
              (payload.outbox_id &&
                item.outbox_id === payload.outbox_id &&
                payload.recipient_email &&
                item.recipient_email === payload.recipient_email) ||
              (payload.user_uuid &&
                item.user_uuid === payload.user_uuid &&
                payload.outbox_id === item.outbox_id);

            if (isMatch) {
              matched = true;
              return {
                ...item,
                status: payload.status || item.status,
                provider: payload.provider || item.provider,
                message_id: payload.message_id || item.message_id,
                sent_at: payload.sent_at || item.sent_at,
                error_message:
                  payload.error_message !== undefined
                    ? payload.error_message
                    : item.error_message,
                updated_at: payload.updated_at || item.updated_at,
              };
            }
            return item;
          });

          // Recalculate summary stats in real-time
          let sent = 0;
          let pending = 0;
          let failed = 0;
          nextList.forEach((item) => {
            const st = String(item.status || "").toUpperCase();
            if (st === "SENT") sent++;
            else if (st === "FAILED") failed++;
            else pending++;
          });
          setStats({ sent, pending, failed });

          // If item is new and we are on page 1, fetch full data
          if (!matched && page === 1) {
            fetchData();
          }

          return nextList;
        });
      } else if (payload.type === "EMAIL_INSERTED") {
        // Antrean email baru ditambahkan
        if (page === 1) {
          fetchData();
        }
      }
    };

    const connectWS = () => {
      if (isCleanedUp) return;
      const token = getValidToken() || "";
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";

      let wsHost = window.location.host;
      if (API_BASE_URL && API_BASE_URL.startsWith("http")) {
        try {
          const u = new URL(API_BASE_URL);
          wsHost = u.host;
        } catch {
          // keep window.location.host
        }
      }

      const wsUrl = `${wsProto}//${wsHost}/ws/email-status${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isCleanedUp) return;
          setIsLiveConnected(true);
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const payload = JSON.parse(event.data);
            handleLiveEvent(payload);
          } catch (e) {
            console.warn("WS parse error:", e);
          }
        };

        ws.onerror = () => {
          if (!isCleanedUp && !sse) {
            connectSSE(token);
          }
        };

        ws.onclose = () => {
          if (isCleanedUp) return;
          setIsLiveConnected(false);
          reconnectTimer = setTimeout(connectWS, 3500);
        };
      } catch (err) {
        console.warn("WS connection error, fallback to SSE:", err);
        connectSSE(token);
      }
    };

    const connectSSE = (token) => {
      if (isCleanedUp || sse) return;
      try {
        const sseUrl = `${API_BASE_URL}/users/email-history/live${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        sse = new EventSource(sseUrl);

        sse.onopen = () => {
          if (isCleanedUp) return;
          setIsLiveConnected(true);
        };

        sse.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const payload = JSON.parse(event.data);
            handleLiveEvent(payload);
          } catch (e) {
            console.warn("SSE parse error:", e);
          }
        };

        sse.onerror = () => {
          if (isCleanedUp) return;
          setIsLiveConnected(false);
          if (sse) {
            sse.close();
            sse = null;
          }
          reconnectTimer = setTimeout(connectWS, 4000);
        };
      } catch (err) {
        console.warn("SSE connection error:", err);
      }
    };

    connectWS();

    return () => {
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
      if (sse) {
        sse.onopen = null;
        sse.onmessage = null;
        sse.onerror = null;
        sse.close();
      }
    };
  }, [fetchData, page]);

  // SMART SAFETY POLLING: Berjalan hanya jika ada email berstatus SENDING/PENDING dan live stream terputus
  useEffect(() => {
    const hasUnresolved = data.some((item) => {
      const s = String(item.status || "").toUpperCase();
      return s === "SENDING" || s === "PENDING";
    });

    if (!hasUnresolved || isLiveConnected) return;

    const interval = setInterval(() => {
      fetchData();
    }, 2500);

    return () => clearInterval(interval);
  }, [data, isLiveConnected, fetchData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleVerifyGoogle = async (item) => {
    if (!item?.id) return;
    setVerifyingId(item.id);
    try {
      const res = await apiClient.post(`/users/email-history/${item.id}/verify`);
      const r = res?.data || {};
      setVerifyResults((prev) => ({
        ...prev,
        [item.id]: {
          checked: true,
          is_sent: r.is_sent,
          labels: r.labels || [],
          snippet: r.snippet || "",
          message_id: r.message_id || item.message_id,
        },
      }));
      addToast(
        r.is_sent ? "success" : "info",
        r.is_sent
          ? `Google API: Email terverifikasi ada di folder Terkirim (SENT)`
          : `Google API: Pesan ditemukan dengan status/label: ${(r.labels || []).join(", ")}`
      );
    } catch (err) {
      console.error("Verify email error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal verifikasi dengan Google API";
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

  const renderStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    switch (s) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Terkirim
          </span>
        );
      case "SENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCw className="w-3 h-3 text-blue-600 animate-spin" />
            Mengirim
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Gagal
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Antrean
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* HEADER */}
          <PageHeader
            icon={Mail}
            title="Riwayat Pengiriman Email"
            subtitle="Monitoring antrean outbox, pengiriman email akun & verifikasi status live pengiriman"
            actions={
              <div className="flex items-center gap-2">
                {/* LIVE DATA STATUS INDICATOR */}
                <Tooltip
                  content={
                    isLiveConnected
                      ? "Terhubung ke live stream realtime (WebSocket/SSE). Status email diperbarui otomatis tanpa refresh."
                      : "Menghubungkan ke live data stream..."
                  }
                >
                  <div
                    className={`inline-flex items-center gap-1.5 h-9 px-3 border rounded-lg text-xs font-semibold shadow-2xs transition-colors ${
                      isLiveConnected
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLiveConnected ? "bg-purple-600 animate-pulse" : "bg-gray-400"
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {isLiveConnected ? "Live Data" : "Offline"}
                    </span>
                  </div>
                </Tooltip>

                <Tooltip content="Refresh Data Riwayat">
                  <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="h-9 w-9 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
                  </button>
                </Tooltip>
              </div>
            }
          />

          {/* METRIC OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Log Email</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{total}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Berhasil Terkirim</p>
                <p className="text-lg font-bold text-emerald-700 leading-tight">
                  {stats.sent || (statusFilter === "SENT" ? total : 0)}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Antrean / Proses</p>
                <p className="text-lg font-bold text-amber-700 leading-tight">
                  {stats.pending || (statusFilter === "PENDING" ? total : 0)}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Gagal / Masalah</p>
                <p className="text-lg font-bold text-rose-700 leading-tight">
                  {stats.failed || (statusFilter === "FAILED" ? total : 0)}
                </p>
              </div>
            </div>
          </div>

          {/* MAIN CARD CONTAINER */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* TOOLBAR: FILTER & SEARCH */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* STATUS TABS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { key: "all", label: "Semua" },
                  { key: "SENT", label: "Terkirim" },
                  { key: "SENDING", label: "Mengirim" },
                  { key: "PENDING", label: "Antrean" },
                  { key: "FAILED", label: "Gagal" },
                ].map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setStatusFilter(tab.key);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* SEARCH BAR */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari penerima / username / subject..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white transition"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-3.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer"
                >
                  Cari
                </button>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchInput("");
                      setPage(1);
                    }}
                    className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-800 rounded-lg transition"
                  >
                    Reset
                  </button>
                )}
              </form>
            </div>

            {/* RESPONSIVE TABLE WRAPPER */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Tabel Riwayat Pengiriman Email"
              className="overflow-x-auto max-w-full"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Penerima</th>
                    <th className="py-3 px-4">Subjek Email</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4 text-center">Verifikasi Live</th>
                    <th className="py-3 px-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading && data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCw className="w-6 h-6 text-purple-600 animate-spin" />
                          <span className="text-xs font-medium">Memuat data riwayat email...</span>
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Mail className="w-8 h-8 text-gray-300" />
                          <span className="text-sm font-semibold text-gray-700">
                            Belum Ada Riwayat Pengiriman
                          </span>
                          <span className="text-xs text-gray-400">
                            Email akun yang dikirim melalui outbox pattern akan tercatat otomatis di sini.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.map((item, idx) => {
                      const vRes = verifyResults[item.id];
                      const isVerifying = verifyingId === item.id;
                      const hasGmailId = Boolean(item.message_id);

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-purple-50/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">
                              {item.recipient_email}
                            </div>
                            {item.username && (
                              <div className="text-[11px] text-gray-500 font-mono">
                                user: {item.username}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800 line-clamp-1 max-w-xs">
                              {item.subject || "Notifikasi Akun SIAMIDA V3"}
                            </div>
                            {item.outbox_id && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                Outbox: {String(item.outbox_id).substring(0, 12)}...
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.provider === "GOOGLE_SMTP" || item.provider === "GMAIL_API" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Google SMTP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                {item.provider || "SMTP"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(item.status)}
                            {item.error_message && (
                              <div className="text-[10px] text-rose-600 mt-1 line-clamp-1 max-w-[180px]">
                                {item.error_message}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-gray-500 text-[11px]">
                            <div>{formatDate(item.sent_at || item.created_at)}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {vRes ? (
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    vRes.is_sent
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  {vRes.is_sent ? "SENT (Google)" : (vRes.labels || []).join(", ") || "Found"}
                                </span>
                              </div>
                            ) : hasGmailId ? (
                              <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => handleVerifyGoogle(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-lg text-[11px] font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                              >
                                {isVerifying ? (
                                  <RotateCw className="w-3 h-3 animate-spin text-indigo-600" />
                                ) : (
                                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                )}
                                <span>{isVerifying ? "Cek..." : "Cek Google"}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedItemDetail(item)}
                              className="px-2 py-1 text-[11px] text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-md font-semibold transition cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan {total > 0 ? (page - 1) * limit + 1 : 0} -{" "}
                  {Math.min(page * limit, total)} dari {total} data
                </span>
                <span className="text-gray-300">|</span>
                <label className="flex items-center gap-1">
                  <span>Per hal:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-7 px-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Detail Log Pengiriman</h3>
                  <p className="text-[11px] text-gray-500">ID Log: #{selectedItemDetail.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px]">Penerima & Akun</span>
                <span className="font-semibold text-gray-900">{selectedItemDetail.recipient_email}</span>
                {selectedItemDetail.username && (
                  <span className="text-gray-500 block">Username: {selectedItemDetail.username}</span>
                )}
              </div>

              <div>
                <span className="text-gray-500 block text-[11px]">Subjek Email</span>
                <span className="font-medium text-gray-800">{selectedItemDetail.subject || "-"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-gray-500 block text-[11px]">Status</span>
                  {renderStatusBadge(selectedItemDetail.status)}
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Provider</span>
                  <span className="font-semibold text-gray-800">
                    {selectedItemDetail.provider === "GMAIL_API"
                      ? "Google SMTP"
                      : selectedItemDetail.provider || "GOOGLE_SMTP"}
                  </span>
                </div>
              </div>

              {selectedItemDetail.message_id && (
                <div>
                  <span className="text-gray-500 block text-[11px]">Google Message ID</span>
                  <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100 break-all select-all block mt-0.5">
                    {selectedItemDetail.message_id}
                  </span>
                </div>
              )}

              {selectedItemDetail.outbox_id && (
                <div>
                  <span className="text-gray-500 block text-[11px]">Outbox Task ID</span>
                  <span className="font-mono text-[11px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 break-all select-all block mt-0.5">
                    {selectedItemDetail.outbox_id}
                  </span>
                </div>
              )}

              {selectedItemDetail.error_message && (
                <div>
                  <span className="text-rose-600 block text-[11px] font-semibold">Error Message</span>
                  <p className="text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-mono text-[11px] mt-0.5 whitespace-pre-wrap">
                    {selectedItemDetail.error_message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-gray-500">
                <div>
                  <span className="block text-gray-400">Dibuat:</span>
                  <span>{formatDate(selectedItemDetail.created_at)}</span>
                </div>
                <div>
                  <span className="block text-gray-400">Terkirim:</span>
                  <span>{formatDate(selectedItemDetail.sent_at)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
