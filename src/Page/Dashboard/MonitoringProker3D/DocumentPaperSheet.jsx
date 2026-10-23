import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCheck2,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Pin,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";
import RubberStamp from "./RubberStamp";

/**
 * Komponen Kertas Berkas Fisik (Document Paper Sheet)
 * Menampilkan lembaran kertas dokumen autentik dengan kop surat, versi bertingkat,
 * cap stempel fisik, dan memo catatan auditor.
 */
export default function DocumentPaperSheet({
  docCategory, // { key: "SK", label: "Surat Keputusan (SK)", status, versions, hasDocument }
  mataProgramTitle,
  unitName,
  tahun,
  onOpenFile, // callback ketika kertas diklik -> buka viewer
}) {
  const versions = docCategory.versions || [];
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);

  const currentVersion = versions[selectedVersionIdx] || versions[0] || null;
  const hasDoc = docCategory.hasDocument && currentVersion;
  const statusKey = hasDoc ? currentVersion.statusKey || docCategory.status.key : "kosong";

  // Ikon berkas sesuai format file
  const getIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-rose-600" />;
      case "excel":
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case "word":
        return <FileCheck2 className="w-4 h-4 text-blue-600" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-100/70 p-3.5 sm:p-4 rounded-3xl border border-stone-200 shadow-2xs relative">
      {/* HEADER KATEGORI & VERSION TABS */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-stone-500 shrink-0"></span>
          <h4 className="text-xs font-black text-stone-900 uppercase tracking-tight truncate">
            {docCategory.shortLabel}
          </h4>
        </div>

        {/* TABS MULTI-VERSI (JIKA ADA LEBIH DARI 1 VERSI) */}
        {versions.length > 1 ? (
          <div className="flex items-center bg-stone-200/90 rounded-xl p-0.5 text-[10px] font-bold shadow-inner">
            {versions.map((ver, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedVersionIdx(idx)}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  selectedVersionIdx === idx
                    ? "bg-white text-stone-900 shadow-xs scale-102"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title={`Lihat ${ver.versionLabel || ver.version}`}
              >
                {ver.version || `v${idx + 1}`}
              </button>
            ))}
          </div>
        ) : versions.length === 1 ? (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-stone-200 text-stone-700">
            {versions[0].version || "v1.0"}
          </span>
        ) : null}
      </div>

      {/* LEMBARAN KERTAS FISIK (SK, SOP, TOR, LAPORAN) */}
      <div
        onClick={() => {
          if (hasDoc && onOpenFile) {
            onOpenFile({
              ...currentVersion,
              docType: docCategory.shortLabel,
              mataProgram: mataProgramTitle,
              unitName,
              tahun,
            });
          }
        }}
        className={`relative flex-1 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 select-none overflow-hidden ${
          hasDoc
            ? "cursor-pointer bg-gradient-to-b from-[#FCFBF7] via-[#FAF8F2] to-[#F5F2E9] border border-amber-900/15 shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 active:scale-[0.99] group"
            : "bg-stone-50 border border-dashed border-stone-300 opacity-70"
        }`}
        style={{
          boxShadow: hasDoc
            ? "inset 0 0 12px rgba(217, 119, 6, 0.03), 0 6px 16px rgba(0,0,0,0.07)"
            : "none",
        }}
      >
        {/* KERTAS WATERMARK KOP SURAT LPMI */}
        <div className="border-b border-stone-200/80 pb-2 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[8.5px] font-bold text-stone-400 tracking-wider uppercase font-mono">
            <span>UNIVERSITAS PAKUAN</span>
            <span>•</span>
            <span>LPMI</span>
          </div>
          <span className="text-[8.5px] font-mono text-stone-400 font-bold">
            {tahun}
          </span>
        </div>

        {hasDoc ? (
          /* ================= ISI KERTAS TERISI DOKUMEN ================= */
          <div className="space-y-2 relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* NAMA BERKAS & IKON */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-stone-100 border border-stone-200 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  {getIcon(currentVersion.fileType)}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                    {currentVersion.file}
                  </h5>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    {currentVersion.versionLabel || currentVersion.version}
                  </p>
                </div>
              </div>

              {/* TANGGAL & PENGUNGGAH */}
              <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                <span className="truncate max-w-[110px]" title={currentVersion.uploader}>
                  {currentVersion.uploader}
                </span>
                <span className="font-mono text-stone-400">
                  {currentVersion.ukuran}
                </span>
              </div>
            </div>

            {/* AUTENTIK RUBBER STAMP (STEMPEL FISIK) DITEMPEL DI TENGAH KERTAS */}
            <div className="py-2.5 flex items-center justify-center my-auto">
              <RubberStamp
                status={statusKey}
                size="md"
                date={currentVersion.tanggalUpload}
              />
            </div>

            {/* STICKY NOTE MEMO JIKA ADA CATATAN AUDITOR */}
            {currentVersion.catatan && currentVersion.catatan !== "-" && (
              <div className="mt-1 p-2 bg-amber-100/90 border border-amber-300 rounded-xl text-[10px] text-amber-900 leading-tight shadow-2xs relative">
                <div className="flex items-center gap-1 font-bold text-amber-950 mb-0.5">
                  <Pin className="w-2.5 h-2.5 text-amber-700 fill-amber-700" />
                  <span>Catatan Auditor:</span>
                </div>
                <p className="line-clamp-2 italic text-amber-800">
                  "{currentVersion.catatan}"
                </p>
              </div>
            )}

            {/* FOOTER CALL-TO-ACTION */}
            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
              <span>Buka Dokumen</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          /* ================= KERTAS KOSONG / BELUM ADA DOKUMEN ================= */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-3 relative z-10">
            <RubberStamp status="kosong" size="md" />
            <p className="text-[11px] text-stone-500 font-medium max-w-[150px]">
              Belum ada berkas {docCategory.shortLabel} diunggah untuk mata program ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
