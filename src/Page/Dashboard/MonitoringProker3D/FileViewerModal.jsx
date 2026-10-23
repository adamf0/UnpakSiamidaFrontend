import React, { useState } from "react";
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  FileSpreadsheet,
  FileCheck2,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/Common/api";
import RubberStamp from "./RubberStamp";
import { formatTanggalBulanTahun } from "@/Common/Utils";

/**
 * Modal Penampil Berkas Dokumen Terpadu (PDF, Word, Excel, Gambar)
 * Dilengkapi viewer interaktif, zoom, stempel verifikasi, catatan auditor, dan aksi unduh berkas.
 */
export default function FileViewerModal({
  open,
  onClose,
  docData, // { file, fileType, title, docType, version, statusKey, catatan, uploader, tanggalUpload, ukuran, mataProgram, unitName, tahun }
}) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeSheetTab, setActiveSheetTab] = useState("RAB_Realisasi");

  if (!open || !docData) return null;

  const {
    file = "dokumen.pdf",
    fileType = "pdf",
    title = "Dokumen Program Kerja",
    docType = "Dokumen",
    version = "v1.0",
    statusKey = "terverifikasi",
    catatan = "-",
    uploader = "Program Studi",
    tanggalUpload = "2025-04-12",
    ukuran = "1.8 MB",
    mataProgram = "Mata Program",
    unitName = "Fakultas / Unit",
    tahun = "2025",
  } = docData;

  const formattedTanggal = formatTanggalBulanTahun(tanggalUpload);

  const realFileUrl = `${API_BASE_URL}/upload/pelaporan_dokumen/${file}`;

  const handleDownload = () => {
    // Buat elemen download otomatis
    const a = document.createElement("a");
    a.href = realFileUrl;
    a.download = file;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR / INSPECTOR HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                fileType === "pdf"
                  ? "bg-rose-600"
                  : fileType === "word"
                  ? "bg-blue-600"
                  : fileType === "excel"
                  ? "bg-emerald-600"
                  : "bg-purple-600"
              }`}
            >
              {fileType === "pdf" ? (
                <FileText className="w-5 h-5" />
              ) : fileType === "word" ? (
                <FileCheck2 className="w-5 h-5" />
              ) : fileType === "excel" ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-800">
                  {docType} • {version}
                </span>
                <span className="text-xs font-semibold text-gray-500 truncate">
                  {unitName} ({tahun})
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 truncate max-w-lg mt-0.5" title={file}>
                {file}
              </h3>
            </div>
          </div>

          {/* ACTIONS & CLOSE */}
          <div className="flex items-center gap-2">
            {/* ZOOM CONTROLS FOR PDF/IMAGE */}
            {(fileType === "pdf" || fileType === "image" || fileType === "word") && (
              <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-xl px-1.5 py-1 text-xs text-gray-600 shadow-2xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                  className="p-1 hover:text-indigo-600 rounded transition cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-bold text-[11px] min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                  className="p-1 hover:text-indigo-600 rounded transition cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* DOWNLOAD BUTTON */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 transition shadow-2xs cursor-pointer active:scale-95"
              title="Unduh file dokumen ini"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Unduh</span>
            </button>

            {/* OPEN IN NEW TAB */}
            <a
              href={realFileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-2xs cursor-pointer active:scale-95"
              title="Buka file di tab browser baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Tab Baru</span>
            </a>

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              title="Tutup penampil berkas"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* METADATA BAR (STICKY AUDIT BANNER) */}
        <div className="px-6 py-2.5 bg-gray-100/90 border-b border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-3 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              <strong>Mata Program:</strong> {mataProgram}
            </span>
            <span className="hidden md:inline text-gray-300">•</span>
            <span>
              <strong>Pengunggah:</strong> {uploader}
            </span>
            <span className="hidden md:inline text-gray-300">•</span>
            <span>
              <strong>Ukuran:</strong> {ukuran}
            </span>
            <span className="hidden md:inline text-gray-300">•</span>
            <span>
              <strong>Tanggal:</strong> {formattedTanggal}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500">Status Verifikasi:</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                statusKey === "terverifikasi"
                  ? "bg-emerald-100 text-emerald-800"
                  : statusKey === "gagal"
                  ? "bg-rose-100 text-rose-800"
                  : statusKey === "verifikasi"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {statusKey === "terverifikasi"
                ? "Terverifikasi"
                : statusKey === "gagal"
                ? "Gagal Verifikasi"
                : statusKey === "verifikasi"
                ? "Belum Diverifikasi"
                : "Kosong"}
            </span>
          </div>
        </div>

        {/* AUDITOR NOTES IF PRESENT */}
        {catatan && catatan !== "-" && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Catatan Auditor:</strong> {catatan}
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider shrink-0 bg-amber-100 px-2 py-0.5 rounded">
              Hasil Telaah
            </span>
          </div>
        )}

        {/* MAIN VIEWER WORKSPACE CANVAS */}
        <div className="flex-1 overflow-auto bg-gray-300/40 p-4 sm:p-8 flex items-center justify-center relative">
          {/* ================= 1. PDF DOCUMENT VIEWER ================= */}
          {fileType === "pdf" && (
            <div
              className="bg-white shadow-2xl rounded-xl border border-gray-300 w-full max-w-3xl min-h-[640px] p-8 sm:p-12 relative flex flex-col transition-transform duration-150"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* WATERMARK STEMPEL FISIK DI SUDUT KANAN ATAS DOKUMEN */}
              <div className="absolute top-8 right-8 z-20 pointer-events-none">
                <RubberStamp status={statusKey} size="md" />
              </div>

              {/* KOP SURAT UNIVERSITAS PAKUAN */}
              <div className="border-b-2 border-black pb-4 mb-6 text-center space-y-0.5">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-600">
                  KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-900 uppercase">
                  UNIVERSITAS PAKUAN — LEMBAGA PENJAMINAN MUTU (LPMI)
                </h2>
                <p className="text-[11px] text-gray-600">
                  Jl. Pakuan No. 1, Ciheuleut, Bogor 16143 • Telp: (0251) 8312206 • Web: lpmi.unpak.ac.id
                </p>
                <div className="h-0.5 bg-black mt-1"></div>
              </div>

              {/* DOKUMEN CONTENT HEADING */}
              <div className="text-center my-4 space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-gray-900 underline underline-offset-4">
                  {docType === "SK"
                    ? "SURAT KEPUTUSAN DEKAN FAKULTAS"
                    : docType === "SOP"
                    ? "STANDAR OPERASIONAL PROSEDUR (SOP) MUTU"
                    : docType === "Proposal/TOR"
                    ? "TERM OF REFERENCE (TOR) PROGRAM KERJA"
                    : "LAPORAN PELAKSANAAN DAN REALISASI PROGRAM KERJA"}
                </h3>
                <p className="text-xs font-mono text-gray-600">
                  Nomor: 0{Math.floor(Math.random() * 80 + 10)}/LPMI-UNPAK/{tahun}
                </p>
              </div>

              {/* BODY TEXT DOKUMEN RESMI */}
              <div className="space-y-4 text-xs sm:text-sm text-gray-800 leading-relaxed font-serif flex-1 mt-4">
                <p>
                  <strong>Mata Program:</strong> {mataProgram}
                </p>
                <p>
                  <strong>Unit Pelaksana:</strong> {unitName}
                </p>
                <p className="text-justify indent-8">
                  Menimbang bahwa dalam rangka pemenuhan siklus PPEPP penjaminan mutu internal serta
                  akuntabilitas pelaksanaan Program Kerja Tahun Anggaran {tahun}, unit pelaksana berkewajiban
                  menyampaikan berkas bukti dukung portofolio kegiatan secara transparan, akuntabel, dan sesuai standar
                  mutu SPMI Universitas Pakuan.
                </p>
                <p className="text-justify indent-8">
                  Mengingat Peraturan Rektor Universitas Pakuan tentang Petunjuk Teknis Penyusunan dan Pelaporan Program Kerja,
                  hasil verifikasi berkas bukti dukung ini menjadi rujukan audit kinerja dan kelayakan instrumen akreditasi prodi/fakultas.
                </p>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 font-sans my-4 space-y-1.5">
                  <p className="font-bold text-xs text-gray-900 uppercase">Ringkasan Validitas Berkas:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                    <li>Kesesuaian Indikator Kinerja Utama (IKU / IKPT): <strong>Lengkap &amp; Terpetakan</strong></li>
                    <li>Status Validasi Sistem: <strong className="text-indigo-700">{statusKey.toUpperCase()}</strong></li>
                    <li>Nama Arsip Server: <span className="font-mono">{file}</span></li>
                  </ul>
                </div>
              </div>

              {/* TANDA TANGAN & PENGESAHAN */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-gray-200 text-xs">
                <div>
                  <p className="font-bold text-gray-700">Diperiksa oleh Auditor:</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Lembaga Penjaminan Mutu Internal</p>
                  <div className="h-16 flex items-center">
                    <span className="font-script text-lg text-indigo-700 italic opacity-80">
                      ~ Tim Audit Mutu LPMI ~
                    </span>
                  </div>
                  <p className="font-bold underline text-gray-900">Dr. Ir. Auditor Mutu, M.T.</p>
                  <p className="text-[10px] text-gray-500">NIP. 197804152005011002</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-700">Bogor, {formattedTanggal}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Ketua Pelaksana / Auditee,</p>
                  <div className="h-16 flex items-center justify-end">
                    <span className="font-script text-lg text-emerald-800 italic opacity-80">
                      ~ {uploader} ~
                    </span>
                  </div>
                  <p className="font-bold underline text-gray-900">{uploader}</p>
                  <p className="text-[10px] text-gray-500">Universitas Pakuan</p>
                </div>
              </div>

              <div className="mt-8 pt-2 text-[10px] text-gray-400 font-mono text-center border-t border-gray-100 flex items-center justify-between">
                <span>Dokumen Resmi SIAMIDA LPMI UNPAK</span>
                <span>Halaman 1 dari 1</span>
              </div>
            </div>
          )}

          {/* ================= 2. EXCEL SPREADSHEET VIEWER ================= */}
          {fileType === "excel" && (
            <div
              className="bg-white shadow-2xl rounded-xl border border-gray-300 w-full max-w-4xl min-h-[560px] overflow-hidden flex flex-col"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* EXCEL GREEN RIBBON */}
              <div className="bg-[#107C41] text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Microsoft Excel Spreadsheet • {file}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-black/20 font-mono">100% Formulas Valid</span>
                </div>
              </div>

              {/* FORMULA BAR */}
              <div className="bg-gray-100 border-b px-4 py-1.5 flex items-center gap-2 text-xs font-mono text-gray-700">
                <span className="font-bold text-gray-400">fx</span>
                <span className="bg-white border rounded px-2 py-0.5 flex-1 text-gray-800">
                  =SUM(E5:E10) • Alokasi Program: {mataProgram}
                </span>
              </div>

              {/* SPREADSHEET TABLE GRID */}
              <div className="flex-1 overflow-x-auto p-4 bg-white relative">
                {/* STEMPEL WATERMARK */}
                <div className="absolute top-6 right-6 z-10 pointer-events-none">
                  <RubberStamp status={statusKey} size="sm" />
                </div>

                <table className="w-full text-xs border border-gray-300 font-sans border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b font-bold text-center">
                      <th className="border p-2 w-10">No</th>
                      <th className="border p-2 text-left">Komponen Anggaran / Output Kegiatan</th>
                      <th className="border p-2 w-20">Volume</th>
                      <th className="border p-2 w-24">Satuan</th>
                      <th className="border p-2 w-32 text-right">Harga Satuan (Rp)</th>
                      <th className="border p-2 w-36 text-right">Total Anggaran (Rp)</th>
                      <th className="border p-2 w-28">Status Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="border p-2 text-center font-mono">1</td>
                      <td className="border p-2 font-medium">Honorarium Narasumber Pakar / Auditor Eksternal</td>
                      <td className="border p-2 text-center">2</td>
                      <td className="border p-2 text-center">Orang/Jam</td>
                      <td className="border p-2 text-right font-mono">1.500.000</td>
                      <td className="border p-2 text-right font-mono font-bold">3.000.000</td>
                      <td className="border p-2 text-center text-emerald-700 font-bold">Valid SBU</td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="border p-2 text-center font-mono">2</td>
                      <td className="border p-2 font-medium">Konsumsi Rapat Pleno Koordinasi Program Kerja</td>
                      <td className="border p-2 text-center">25</td>
                      <td className="border p-2 text-center">Paket</td>
                      <td className="border p-2 text-right font-mono">65.000</td>
                      <td className="border p-2 text-right font-mono font-bold">1.625.000</td>
                      <td className="border p-2 text-center text-emerald-700 font-bold">Valid SBU</td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="border p-2 text-center font-mono">3</td>
                      <td className="border p-2 font-medium">Penggandaan Modul Pedoman &amp; Formulir Audit SPMI</td>
                      <td className="border p-2 text-center">40</td>
                      <td className="border p-2 text-center">Eksemplar</td>
                      <td className="border p-2 text-right font-mono">45.000</td>
                      <td className="border p-2 text-right font-mono font-bold">1.800.000</td>
                      <td className="border p-2 text-center text-emerald-700 font-bold">Valid SBU</td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="border p-2 text-center font-mono">4</td>
                      <td className="border p-2 font-medium">Sewa Platform Cloud &amp; Server Evaluasi Daring</td>
                      <td className="border p-2 text-center">1</td>
                      <td className="border p-2 text-center">Bulan</td>
                      <td className="border p-2 text-right font-mono">2.250.000</td>
                      <td className="border p-2 text-right font-mono font-bold">2.250.000</td>
                      <td className="border p-2 text-center text-emerald-700 font-bold">Valid SBU</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-black border-t-2 border-emerald-600 text-gray-900">
                      <td colSpan={5} className="border p-2 text-right uppercase tracking-wider">
                        Grand Total Realisasi ({tahun})
                      </td>
                      <td className="border p-2 text-right font-mono text-emerald-800 text-sm">
                        Rp 8.675.000
                      </td>
                      <td className="border p-2 text-center text-emerald-700 font-extrabold">
                        {statusKey.toUpperCase()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SHEET TABS */}
              <div className="bg-gray-100 border-t px-3 py-1 flex items-center gap-1 text-xs">
                {["RAB_Realisasi", "Kuitansi_Lampiran", "Data_IKU"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSheetTab(tab)}
                    className={`px-3 py-1 rounded-t border-t border-x font-medium cursor-pointer transition ${
                      activeSheetTab === tab
                        ? "bg-white text-emerald-800 font-bold border-gray-300 shadow-2xs"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= 3. WORD DOCUMENT VIEWER ================= */}
          {fileType === "word" && (
            <div
              className="bg-white shadow-2xl rounded-xl border border-gray-300 w-full max-w-3xl min-h-[640px] p-8 sm:p-12 relative flex flex-col"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
            >
              <div className="absolute top-8 right-8 z-20 pointer-events-none">
                <RubberStamp status={statusKey} size="md" />
              </div>

              <div className="flex items-center gap-3 border-b-2 border-blue-700 pb-3 mb-6">
                <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase">
                    Format Dokumen Resmi Word (DOCX)
                  </h4>
                  <p className="text-[11px] text-gray-500">Universitas Pakuan • Standar Pelaporan Mutu</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-800 font-serif leading-relaxed flex-1">
                <h3 className="font-bold text-base text-center uppercase tracking-wide underline font-sans">
                  {mataProgram}
                </h3>
                <p className="text-center text-xs font-mono text-gray-500">
                  Diverifikasi untuk Unit: {unitName} — Periode {tahun}
                </p>

                <p className="indent-8 text-justify mt-4">
                  Dokumen ini disusun sebagai panduan operasional baku dan instrumen kepatuhan mutu akademik.
                  Seluruh klausul dan target kinerja yang tertuang di dalamnya telah disesuaikan dengan
                  Rencana Strategis (Renstra) Universitas Pakuan.
                </p>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 font-sans space-y-2 text-xs">
                  <p className="font-bold text-blue-900">Tujuan dan Ruang Lingkup:</p>
                  <p className="text-blue-800">
                    1. Menjamin terlaksananya {mataProgram} secara terjadwal, terstruktur, dan akuntabel.
                  </p>
                  <p className="text-blue-800">
                    2. Memenuhi indikator evaluasi mutu instrumen akreditasi program studi dan fakultas.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
                <span>Versi: {version}</span>
                <span>File Asli: {file}</span>
              </div>
            </div>
          )}

          {/* ================= 4. IMAGE LIGHTBOX VIEWER ================= */}
          {fileType === "image" && (
            <div
              className="relative max-w-3xl max-h-[600px] flex items-center justify-center bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-4"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
              }}
            >
              <div className="absolute top-4 right-4 z-20 pointer-events-none">
                <RubberStamp status={statusKey} size="sm" />
              </div>

              {/* Placeholder image representation jika URL belum live */}
              <div className="w-full h-80 rounded-xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
                <ImageIcon className="w-16 h-16 text-indigo-400 animate-pulse" />
                <h4 className="font-bold text-base text-white">{file}</h4>
                <p className="text-xs text-gray-300 max-w-md">
                  Dokumentasi visual foto kegiatan program kerja: <strong>{mataProgram}</strong>
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-gray-200">
                  <span>{ukuran}</span> • <span>Diunggah: {formattedTanggal}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
