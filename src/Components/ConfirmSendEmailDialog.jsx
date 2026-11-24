import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Mail,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Paperclip,
  Upload,
  FileText,
  X,
  RotateCw,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/Common/api";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXTS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
  ".csv",
  ".zip",
];

const formatFileSize = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ConfirmSendEmailDialog({
  open,
  users = [],
  loading = false,
  onConfirm,
  onClose,
  onSuccess,
}) {
  const show = Boolean(open);
  const total = users.length;
  const usersWithEmail = users.filter((u) => Boolean(u?.Email || u?.email));
  const usersWithoutEmail = users.filter((u) => !Boolean(u?.Email || u?.email));

  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // REALTIME TRACKING STATE
  const [viewMode, setViewMode] = useState("form"); // "form" | "progress"
  const [currentOutboxId, setCurrentOutboxId] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!show) {
      setFiles([]);
      setFileError(null);
      setIsDragging(false);
      setViewMode("form");
      setCurrentOutboxId(null);
      setStatusData(null);
      setSubmitting(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [show]);

  // POLL STATUS
  const pollStatus = async (outboxId) => {
    if (!outboxId) return;
    try {
      const res = await apiClient.get("/users/email-status", {
        params: { outbox_id: outboxId, verify: "true" },
      });
      const data = res?.data || {};
      setStatusData(data);
      if (data.is_completed) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setIsPolling(false);
        onSuccess?.();
      }
    } catch (err) {
      console.warn("Poll email status error:", err);
    }
  };

  const handleStartSend = async () => {
    if (submitting || loading) return;
    setSubmitting(true);
    try {
      const result = await onConfirm?.(files);
      const outboxId = result?.outbox_id || result?.data?.outbox_id;
      if (outboxId) {
        setCurrentOutboxId(outboxId);
        setViewMode("progress");
        setIsPolling(true);
        // Polling langsung pertama kali
        pollStatus(outboxId);
        // Polling setiap 1.5 detik
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
          pollStatus(outboxId);
        }, 1500);
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAttachmentSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const addIncomingFiles = (incomingList) => {
    setFileError(null);
    const incoming = Array.from(incomingList || []);
    if (incoming.length === 0) return;

    const next = [...files];
    let runningTotal = next.reduce((sum, f) => sum + (f.size || 0), 0);

    for (const file of incoming) {
      const lowerName = (file.name || "").toLowerCase();
      const dotIdx = lowerName.lastIndexOf(".");
      const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : "";

      if (!ALLOWED_EXTS.includes(ext)) {
        setFileError(`Tipe file "${file.name}" tidak diizinkan.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`Ukuran "${file.name}" melebihi batas maksimal 10 MB.`);
        continue;
      }
      const isDuplicate = next.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );
      if (isDuplicate) continue;

      if (next.length >= MAX_FILES) {
        setFileError(`Maksimal ${MAX_FILES} file lampiran per pengiriman.`);
        break;
      }
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        setFileError("Total ukuran seluruh lampiran melebihi batas maksimal 15 MB.");
        break;
      }

      next.push(file);
      runningTotal += file.size;
    }

    setFiles(next);
  };

  const handleRemoveFile = (index) => {
    setFileError(null);
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const emailPreviewText =
    `kami sampaikan akun SIAMIDA V3 sebagai berikut :\n\n` +
    `username : [username]\n` +
    `password : [password]\n` +
    `level : [role]\n\n` +
    `buka siamida.unpak.ac.id dan pilih SIAMIDA V3.` +
    (files.length > 0
      ? `\n\nLampiran (${files.length} file): ${files.map((f) => f.name).join(", ")}`
      : "") +
    `\n\nTerimakasih`;

  const isCompleted = Boolean(statusData?.is_completed);
  const sentCount = statusData?.sent || 0;
  const failedCount = statusData?.failed || 0;
  const totalItems = statusData?.total || usersWithEmail.length || 1;
  const progressPercent = Math.min(
    100,
    Math.round(((sentCount + failedCount) / totalItems) * 100)
  );

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={submitting ? () => {} : onClose}
      >
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl border border-gray-100 transition-all">
                {/* VIEW MODE 1: FORM PENGIRIMAN */}
                {viewMode === "form" ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Mail size={24} strokeWidth={2} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <Dialog.Title className="text-lg font-bold text-gray-900 leading-snug">
                          Kirim Email Akun SIAMIDA V3
                        </Dialog.Title>
                        <p className="text-xs text-gray-500 mt-1">
                          Kredensial username, password, dan role akan dikirimkan melalui antrean background job (Outbox).
                        </p>
                      </div>
                    </div>

                    {/* SUMMARY STATS */}
                    <div className="mt-4 p-3.5 rounded-xl bg-gray-50/90 border border-gray-200/80 text-xs text-gray-700 space-y-2">
                      <div className="flex items-center justify-between font-medium">
                        <span>Total akun yang dipilih:</span>
                        <span className="font-bold text-gray-900">{total} akun</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Memiliki alamat email:</span>
                        </span>
                        <span className="font-semibold">{usersWithEmail.length} akun</span>
                      </div>
                      {usersWithoutEmail.length > 0 && (
                        <div className="flex items-center justify-between text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Tanpa email (dilewati):</span>
                          </span>
                          <span className="font-bold">{usersWithoutEmail.length} akun</span>
                        </div>
                      )}
                    </div>

                    {/* PREVIEW LIST */}
                    <div className="mt-3.5">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Daftar Penerima ({usersWithEmail.length}):
                      </label>
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 text-xs">
                        {usersWithEmail.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 italic">
                            Tidak ada akun dengan email valid
                          </div>
                        ) : (
                          usersWithEmail.map((u, i) => (
                            <div
                              key={u.UUID || u.uuid || i}
                              className="p-2.5 flex items-center justify-between hover:bg-gray-50/80"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-gray-800 truncate">
                                  {u.Name || u.name || u.Username || u.nidn_username}
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono truncate">
                                  {u.Email || u.email}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {u.Level || u.level || "user"}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* FILE ATTACHMENTS */}
                    <div className="mt-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          <span>Lampiran File (Opsional)</span>
                        </label>
                        {files.length > 0 && (
                          <span className="text-[11px] text-gray-500">
                            {files.length}/{MAX_FILES} file · {formatFileSize(totalAttachmentSize)}
                          </span>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        disabled={submitting || loading}
                        accept={ALLOWED_EXTS.join(",")}
                        className="hidden"
                        onChange={(e) => {
                          addIncomingFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />

                      <div
                        role="button"
                        tabIndex={submitting || loading ? -1 : 0}
                        onClick={() => {
                          if (!submitting && !loading) fileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (!submitting && !loading && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!submitting && !loading) setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (!submitting && !loading) addIncomingFiles(e.dataTransfer.files);
                        }}
                        className={`rounded-xl border border-dashed px-3.5 py-3 text-center transition cursor-pointer ${
                          submitting || loading
                            ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                            : isDragging
                            ? "border-indigo-500 bg-indigo-50/70"
                            : "border-gray-300 bg-gray-50/60 hover:border-indigo-400 hover:bg-indigo-50/30"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-700">
                          <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Klik atau seret file ke sini untuk dilampirkan ke email</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          PDF, Office, Gambar, TXT/CSV, ZIP · Maks. 5 file (10 MB/file, total 15 MB)
                        </p>
                      </div>

                      {fileError && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fileError}</span>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto">
                          {files.map((file, idx) => (
                            <div
                              key={`${file.name}-${file.size}-${idx}`}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span
                                  className="font-medium text-gray-800 truncate"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                <span className="text-[11px] text-gray-400 shrink-0">
                                  ({formatFileSize(file.size)})
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={submitting || loading}
                                onClick={() => handleRemoveFile(idx)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer disabled:opacity-50"
                                aria-label={`Hapus lampiran ${file.name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* EMAIL TEMPLATE PREVIEW NOTE */}
                    <div className="mt-4 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Format Notifikasi Email:</span>
                      </div>
                      <div className="italic text-gray-600 font-mono text-[10.5px] bg-white/80 p-2 rounded border border-indigo-100/60 mt-1 whitespace-pre-line">
                        {emailPreviewText}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting || loading}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleStartSend}
                        disabled={submitting || loading || usersWithEmail.length === 0}
                        className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting || loading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                            <span>Memproses Outbox...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Kirim ke {usersWithEmail.length} Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  /* VIEW MODE 2: REALTIME OUTBOX & DELIVERY PROGRESS */
                  <div>
                    <div className="flex items-start justify-between pb-3.5 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? failedCount === 0
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                              : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                          }`}
                        >
                          {isCompleted ? (
                            failedCount === 0 ? (
                              <CheckCircle size={22} />
                            ) : (
                              <AlertCircle size={22} />
                            )
                          ) : (
                            <RotateCw size={20} className="animate-spin" />
                          )}
                        </div>

                        <div>
                          <Dialog.Title className="text-base font-bold text-gray-900 leading-snug">
                            {isCompleted
                              ? "Pengiriman Selesai Diproses"
                              : "Memproses Pengiriman Email..."}
                          </Dialog.Title>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            Outbox ID: {currentOutboxId?.slice(0, 18)}...
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

                    {/* PROGRESS BAR */}
                    <div className="mt-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                        <span className="text-gray-700">
                          {isCompleted
                            ? "Status Akhir Pengiriman:"
                            : "Memproses Antrean Outbox..."}
                        </span>
                        <span className="font-bold text-indigo-700">
                          {sentCount + failedCount} / {totalItems} ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isCompleted && failedCount > 0
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-[11px] mt-2 font-medium">
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle size={12} />
                          <b>{sentCount}</b> Berhasil Terkirim
                        </span>
                        {failedCount > 0 && (
                          <span className="text-rose-700 flex items-center gap-1">
                            <AlertCircle size={12} />
                            <b>{failedCount}</b> Gagal
                          </span>
                        )}
                        {!isCompleted && (
                          <span className="text-amber-700 flex items-center gap-1 animate-pulse">
                            <Clock size={12} />
                            <b>{totalItems - (sentCount + failedCount)}</b> Dalam Proses
                          </span>
                        )}
                      </div>
                    </div>

                    {/* LIVE RECIPIENTS LIST */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                          Status Penerima ({statusData?.items?.length || usersWithEmail.length}):
                        </label>
                        <button
                          type="button"
                          onClick={() => pollStatus(currentOutboxId)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Cek realtime ke Google API sekarang"
                        >
                          <RotateCw size={11} className={isPolling ? "animate-spin" : ""} />
                          <span>Cek Live Status</span>
                        </button>
                      </div>

                      <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 text-xs">
                        {(statusData?.items || usersWithEmail).map((item, idx) => {
                          const email = item.recipient_email || item.Email || item.email;
                          const name = item.username || item.Name || item.name;
                          const st = item.status || "PENDING";
                          const isSent = st === "SENT";
                          const isFailed = st === "FAILED";
                          const isSending = st === "SENDING";
                          const isGoogle = item.provider === "GOOGLE_SMTP" || item.provider === "GMAIL_API";

                          return (
                            <div
                              key={item.id || idx}
                              className="p-2.5 flex items-center justify-between hover:bg-gray-50/80 transition"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-gray-800 truncate">
                                  {name}
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono truncate">
                                  {email}
                                </div>
                                {isSent && isGoogle && item.message_id && (
                                  <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono mt-0.5">
                                    <ShieldCheck size={11} className="text-emerald-600" />
                                    <span>Google ID: {item.message_id.slice(0, 14)}...</span>
                                    {item.google_verified && (
                                      <span className="font-bold text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                        ✓ LIVE VERIFIED
                                      </span>
                                    )}
                                  </div>
                                )}
                                {isFailed && item.error_message && (
                                  <div className="text-[10.5px] text-rose-600 mt-0.5 truncate" title={item.error_message}>
                                    Error: {item.error_message}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 text-right">
                                {isSent && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle size={12} />
                                    <span>{isGoogle ? "Google SMTP" : "Terkirim"}</span>
                                  </span>
                                )}
                                {isSending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <RotateCw size={12} className="animate-spin" />
                                    <span>Mengirim...</span>
                                  </span>
                                )}
                                {!isSent && !isFailed && !isSending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={12} />
                                    <span>Antrean</span>
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertCircle size={12} />
                                    <span>Gagal</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="mt-5 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        className={`w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition cursor-pointer ${
                          isCompleted
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {isCompleted ? "Selesai & Tutup" : "Tutup (Lanjut di Background)"}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
