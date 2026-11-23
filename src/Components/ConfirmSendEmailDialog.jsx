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
} from "lucide-react";

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
}) {
  const show = Boolean(open);
  const total = users.length;
  const usersWithEmail = users.filter((u) => Boolean(u?.Email || u?.email));
  const usersWithoutEmail = users.filter((u) => !Boolean(u?.Email || u?.email));

  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!show) {
      setFiles([]);
      setFileError(null);
      setIsDragging(false);
    }
  }, [show]);

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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl border border-gray-100 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail size={24} strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg font-bold text-gray-900 leading-snug">
                      Kirim Email Akun SIAMIDA V3
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-1">
                      Kredensial username, password, dan role akan dikirimkan melalui antrean background job.
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
                        <div key={u.UUID || u.uuid || i} className="p-2.5 flex items-center justify-between hover:bg-gray-50/80">
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
                    disabled={loading}
                    accept={ALLOWED_EXTS.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      addIncomingFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <div
                    role="button"
                    tabIndex={loading ? -1 : 0}
                    onClick={() => {
                      if (!loading) fileInputRef.current?.click();
                    }}
                    onKeyDown={(e) => {
                      if (!loading && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!loading) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (!loading) addIncomingFiles(e.dataTransfer.files);
                    }}
                    className={`rounded-xl border border-dashed px-3.5 py-3 text-center transition cursor-pointer ${
                      loading
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
                            <span className="font-medium text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={loading}
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
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirm?.(files)}
                    disabled={loading || usersWithEmail.length === 0}
                    className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
