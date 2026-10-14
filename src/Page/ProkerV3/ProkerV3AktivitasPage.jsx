import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { apiClient } from "@/Common/api";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  formatBytes,
  formatRupiah,
  hasRealisasiAnggaran,
  getRealisasiAnggaran,
  getTimelineRkSlots,
  getTimelineRSlots,
} from "./prokerConstants";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Target,
  User,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Send,
  Check,
  Upload,
  FileText,
  DollarSign,
  Info,
  RefreshCw,
  FolderOpen,
  FileIcon,
  ExternalLink,
  X,
  Eye,
  AlertCircle,
  Save,
  Coins,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ProkerV3AktivitasPage() {
  const { uuid: prokerUuid } = useParams();
  const navigate = useNavigate();
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();
  const { level, setLevel, listLevel } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const [openChangeLevel, setOpenChangeLevel] = useState(false);

  // Data state
  const [loading, setLoading] = useState(true);
  const [proker, setProker] = useState(null);
  const [activities, setActivities] = useState([]);

  // Form Activity Modal State
  const [actModalOpen, setActModalOpen] = useState(false);
  const [actModalMode, setActModalMode] = useState("create");
  const [selectedAct, setSelectedAct] = useState(null);

  // Form Activity Inputs
  const [actNama, setActNama] = useState("");
  const [actPic, setActPic] = useState("");
  const [actAnggaran, setActAnggaran] = useState(0);
  const [actAnggaranStr, setActAnggaranStr] = useState("0");
  const [actCapaian, setActCapaian] = useState("");
  const [actMasalah, setActMasalah] = useState("");
  const [actPemecahan, setActPemecahan] = useState("");
  const [actStatus, setActStatus] = useState("draft");
  const [showEvaluasi, setShowEvaluasi] = useState(false);
  const [savingAct, setSavingAct] = useState(false);

  // Delete State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actToDelete, setActToDelete] = useState(null);

  // Fetch Data (Proker & Activities)
  const fetchData = async () => {
    if (!prokerUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${prokerUuid}/aktivitas`);
      const json = res.data;
      setProker(json.proker || null);
      setActivities(json.data || []);
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [prokerUuid]);

  // Aggregate stats
  const { totalAnggaran, totalRealisasi, hasRealisasi } = useMemo(() => {
    let totAng = 0;
    let totReal = 0;
    let anyReal = false;
    (activities || []).forEach((curr) => {
      const ang = Number(curr.Anggaran) || 0;
      totAng += ang;
      if (hasRealisasiAnggaran(curr)) {
        anyReal = true;
        totReal += getRealisasiAnggaran(curr);
      } else {
        totReal += ang;
      }
    });
    return {
      totalAnggaran: totAng,
      totalRealisasi: totReal,
      hasRealisasi: anyReal,
    };
  }, [activities]);

  // ==========================================
  // ACTIVITY CRUD HANDLERS
  // ==========================================
  const handleAnggaranInputChange = (e) => {
    const rawValue = e.target.value;
    // Ambil hanya digit angka (0-9)
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      setActAnggaran(0);
      setActAnggaranStr("");
      return;
    }
    const numericValue = Number(digitsOnly);
    setActAnggaran(numericValue);
    setActAnggaranStr(new Intl.NumberFormat("id-ID").format(numericValue));
  };

  const openCreateActivity = () => {
    setActModalMode("create");
    setSelectedAct(null);
    setActNama("");
    setActPic(user?.nama || "");
    setActAnggaran(0);
    setActAnggaranStr("");
    setActCapaian("");
    setActMasalah("");
    setActPemecahan("");
    setActStatus("draft");
    setShowEvaluasi(false);
    setActModalOpen(true);
  };

  const openEditActivity = (act) => {
    setActModalMode("edit");
    setSelectedAct(act);
    setActNama(act.Aktivitas || "");
    setActPic(act.PIC || "");
    const initialAnggaran = Number(act.Anggaran) || 0;
    setActAnggaran(initialAnggaran);
    setActAnggaranStr(initialAnggaran > 0 ? new Intl.NumberFormat("id-ID").format(initialAnggaran) : "0");
    setActCapaian(act.Capaian || "");
    setActMasalah(act.Masalah || "");
    setActPemecahan(act.PemecahanMasalah || "");
    setActStatus(act.Status || "draft");
    setShowEvaluasi(Boolean(act.Capaian || act.Masalah || act.PemecahanMasalah));
    setActModalOpen(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!actNama.trim()) {
      addToast("warning", "Nama aktivitas / kegiatan wajib diisi");
      return;
    }

    setSavingAct(true);
    try {
      const token = getValidToken();
      const payload = {
        aktivitas: actNama.trim(),
        pic: actPic.trim(),
        anggaran: Number(actAnggaran) || 0,
        status: actStatus,
        capaian: actCapaian.trim(),
        masalah: actMasalah.trim(),
        pemecahan_masalah: actPemecahan.trim(),
      };

      const url =
        actModalMode === "edit"
          ? `/proker_v3/aktivitas/${selectedAct.UUID}`
          : `/proker_v3/${prokerUuid}/aktivitas`;

      const res =
        actModalMode === "edit"
          ? await apiClient.put(url, payload)
          : await apiClient.post(url, payload);

      const json = res.data;

      addToast(
        "success",
        actModalMode === "edit"
          ? "Aktivitas berhasil diperbarui"
          : "Aktivitas baru berhasil ditambahkan"
      );
      setActModalOpen(false);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Terjadi kesalahan sistem");
    } finally {
      setSavingAct(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!actToDelete?.UUID) return;
    try {
      const res = await apiClient.delete(`/proker_v3/aktivitas/${actToDelete.UUID}`);
      const json = res.data;
      addToast("success", "Aktivitas berhasil dihapus");
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal menghapus aktivitas");
    } finally {
      setConfirmDelete(false);
      setActToDelete(null);
    }
  };

  const handleUpdateStatusActivity = async (act, nextStatus) => {
    try {
      const res = await apiClient.put(`/proker_v3/aktivitas/${act.UUID}/status`, {
        status: nextStatus,
      });
      const json = res.data;
      addToast("success", `Status aktivitas diubah menjadi: ${nextStatus.toUpperCase()}`);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal memperbarui status");
    }
  };

  // Navigate to Timeline Page
  const openTimelinePage = (act) => {
    if (act?.UUID) {
      navigate(`/proker_v3/${prokerUuid}/aktivitas/${act.UUID}/timeline`);
    }
  };

  // Navigate to Dokumen Proker Page
  const openDokumenProker = () => {
    if (prokerUuid) {
      navigate(`/proker_v3/${prokerUuid}/dokumen`);
    }
  };

  return (
    <>
      <Navbar
        level={level}
        setLevel={setLevel}
        listLevel={listLevel}
        onOpenChangeLevel={() => setOpenChangeLevel(true)}
      />
      <ChangeLevelModal
        open={openChangeLevel}
        onClose={() => setOpenChangeLevel(false)}
      />

      <div className="min-h-screen bg-slate-50/60 pb-16 pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/proker_v3")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-purple-700 shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Program Kerja</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl text-gray-500 bg-white border border-gray-200 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer shadow-2xs"
              title="Segarkan data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* TOP CARD: RINGKASAN PROGRAM KERJA (MATRIX_PROKER) */}
        {loading && !proker ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-xs text-gray-500 font-medium">Memuat rincian program kerja...</span>
          </div>
        ) : proker ? (
          <div className="bg-white rounded-2xl border border-purple-100/80 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-purple-100/40 via-indigo-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Header Badges & Title */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Tahun {proker.Tahun || "2026"}
                </span>
                {proker.NamaFakultasUnit && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Building2 className="w-3.5 h-3.5" />
                    {proker.NamaFakultasUnit}
                  </span>
                )}
                <span className="text-[11px] font-bold text-gray-400">
                  ID Matriks: #{proker.Id}
                </span>
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                  {proker.NamaProgram}
                </h1>
              </div>

              {/* Grid Metadata Matriks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                {/* Standar & Indikator */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Standar & Sub Standar</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                    {proker.StandarSubStandar || "-"}
                  </p>
                  <p className="text-[11px] text-gray-500 italic line-clamp-1">
                    Indikator: {proker.IndikatorKinerja || "-"}
                  </p>
                </div>

                {/* Target Unpak & Target Unit */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <Target className="w-3.5 h-3.5" />
                    <span>Target Capaian</span>
                  </div>
                  <div className="text-xs text-gray-700">
                    Target Unpak: <b className="text-emerald-700">{proker.TargetUnpak || "-"}</b>
                  </div>
                  <div className="text-xs text-gray-700">
                    Target Unit: <b className="text-purple-700">{proker.TargetUnit || "-"}</b>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Capaian Lalu: {proker.CapaianUnitLalu || "-"}
                  </p>
                </div>

                {/* Output & Outcome */}
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Luaran & Dampak</span>
                  </div>
                  <div className="text-xs text-gray-700 line-clamp-2">
                    <b>Output:</b> {proker.Output || "-"}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-2">
                    <b>Outcome:</b> {proker.Outcome || "-"}
                  </div>
                </div>

                {/* Total Stats */}
                <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-xs space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-purple-200">
                    Total Anggaran Akumulatif
                  </div>
                  <div className="text-base font-extrabold font-mono">
                    {hasRealisasi ? (
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="line-through text-purple-200/80 text-xs font-normal decoration-rose-300 decoration-1"
                          title="Total Anggaran Awal"
                        >
                          {formatRupiah(totalAnggaran)}
                        </span>
                        <span title="Total Realisasi Anggaran Baru">
                          {formatRupiah(totalRealisasi)}
                        </span>
                      </div>
                    ) : (
                      formatRupiah(totalAnggaran)
                    )}
                  </div>
                  <div className="text-[11px] text-purple-100 flex items-center justify-between pt-0.5">
                    <span>{activities.length} Aktivitas Kegiatan</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      Aktif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* MAIN SECTION: TABEL AKTIVITAS KEGIATAN (AKTIVITASV2) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-gray-100 bg-linear-to-r from-gray-50/80 via-white to-gray-50/80">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>Daftar Aktivitas Kegiatan</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Kelola aktivitas, penanggung jawab, rincian anggaran, jadwal [RK] & [R], serta unggah bukti dokumen
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateActivity}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aktivitas Baru</span>
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No.</th>
                  <th className="py-3 px-4 min-w-[240px]">Aktivitas / Kegiatan</th>
                  <th className="py-3 px-4 min-w-[130px]">PIC Kegiatan</th>
                  <th className="py-3 px-4 min-w-[150px] text-right">Anggaran (Rp)</th>
                  <th className="py-3 px-4 min-w-[170px]">Dokumen Referensi</th>
                  <th className="py-3 px-4 min-w-[210px]">Jadwal & Bukti</th>
                  <th className="py-3 px-4 min-w-[130px]">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-1" />
                      <p className="text-xs font-semibold text-gray-600">
                        Belum ada aktivitas pada program kerja ini
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Klik tombol <b>"+ Tambah Aktivitas Baru"</b> di atas untuk mulai membuat kegiatan
                      </p>
                    </td>
                  </tr>
                ) : (
                  activities.map((act, idx) => {
                    const actStatusStr = (act.Status || "draft").toLowerCase();
                    const tlList = act.Timelines || [];
                    const rkSlotSet = new Set();
                    const rSlotSet = new Set();
                    let filesCount = 0;

                    tlList.forEach((tl) => {
                      getTimelineRkSlots(tl).forEach((s) => rkSlotSet.add(s));
                      getTimelineRSlots(tl).forEach((s) => rSlotSet.add(s));
                      filesCount += (tl.Files || []).length;
                    });

                    const rkCount = rkSlotSet.size;
                    const rCount = rSlotSet.size;

                    return (
                      <tr key={act.UUID} className="hover:bg-purple-50/20 transition">
                        {/* No */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-500">
                          {idx + 1}
                        </td>

                        {/* Aktivitas */}
                        <td className="py-3.5 px-4 font-semibold text-gray-900 leading-snug">
                          <div className="space-y-1">
                            <span className="line-clamp-2">{act.Aktivitas}</span>
                            {act.Capaian && (
                              <div className="text-[11px] text-emerald-700 font-normal">
                                Capaian: {act.Capaian}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* PIC */}
                        <td className="py-3.5 px-4 text-gray-700 font-medium">
                          {act.PIC || "-"}
                        </td>

                        {/* Anggaran */}
                        <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap">
                          {hasRealisasiAnggaran(act) ? (
                            <div>
                              <span
                                className="line-through text-gray-400 text-[11px] block font-normal decoration-rose-500 decoration-1"
                                title="Anggaran Awal"
                              >
                                {formatRupiah(act.Anggaran)}
                              </span>
                              <span
                                className="font-bold text-emerald-700 text-xs block"
                                title="Realisasi Anggaran Baru"
                              >
                                {formatRupiah(getRealisasiAnggaran(act))}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-emerald-700">
                              {formatRupiah(act.Anggaran)}
                            </span>
                          )}
                        </td>

                        {/* Dokumen Referensi */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-gray-700 block whitespace-nowrap">
                              {(act.DokumenReferensiFiles || []).length > 0
                                ? `${(act.DokumenReferensiFiles || []).length} Berkas Terunggah`
                                : "Belum ada berkas"}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate(`/proker_v3/${prokerUuid}/dokumen?act=${act.UUID}`, { state: { aktivitas: act } })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 transition cursor-pointer group shadow-2xs whitespace-nowrap"
                              title="Buka halaman dokumen program kerja untuk aktivitas ini"
                            >
                              <FileText className="w-3 h-3 text-indigo-600 group-hover:text-white shrink-0" />
                              <span>Dokumen Proker →</span>
                            </button>
                          </div>
                        </td>

                        {/* Jadwal Timeline & Bukti File */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => openTimelinePage(act)}
                            className="inline-flex flex-col gap-1.5 p-2.5 rounded-xl border border-purple-200/90 bg-purple-50/40 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition text-left cursor-pointer group w-full shadow-2xs"
                            title="Klik untuk membuka kelola jadwal rencana [RK] & realisasi [R] serta berkas bukti kegiatan"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-gray-800 group-hover:text-white">
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <Clock className="w-3.5 h-3.5 text-purple-600 group-hover:text-white shrink-0" />
                                <span>Jadwal RK/R</span>
                              </span>
                              <span className="text-[10px] bg-purple-100 group-hover:bg-white text-purple-800 group-hover:text-purple-700 px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shrink-0 transition-colors">
                                RK: {rkCount} | R: {rCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 group-hover:text-purple-100 pt-1 border-t border-purple-100/60 group-hover:border-purple-500">
                              <span className="whitespace-nowrap">Bukti Kegiatan:</span>
                              <span className="font-bold text-indigo-700 group-hover:text-white whitespace-nowrap">
                                {filesCount} Berkas
                              </span>
                            </div>
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isAdmin ? (
                            <select
                              value={actStatusStr}
                              onChange={(e) => handleUpdateStatusActivity(act, e.target.value)}
                              className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer outline-none uppercase tracking-wider ${
                                actStatusStr === "disetujui"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : actStatusStr === "diajukan"
                                  ? "bg-blue-50 text-blue-800 border-blue-300"
                                  : actStatusStr === "selesai"
                                  ? "bg-purple-50 text-purple-800 border-purple-300"
                                  : "bg-gray-100 text-gray-700 border-gray-300"
                              }`}
                            >
                              <option value="draft">DRAF</option>
                              <option value="diajukan">DIAJUKAN</option>
                              <option value="disetujui">DISETUJUI</option>
                              <option value="selesai">SELESAI</option>
                            </select>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  actStatusStr === "disetujui"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : actStatusStr === "diajukan"
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : "bg-gray-100 text-gray-700 border-gray-300"
                                }`}
                              >
                                {actStatusStr}
                              </span>
                              {actStatusStr === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatusActivity(act, "diajukan")}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Ajukan</span>
                                </button>
                              )}
                              {actStatusStr === "diajukan" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatusActivity(act, "draft")}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Batal Ajukan</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip title="Kelola Jadwal RK & R serta Unggah Bukti">
                              <button
                                type="button"
                                onClick={() => openTimelineModal(act)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip title="Edit Aktivitas">
                              <button
                                type="button"
                                onClick={() => openEditActivity(act)}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip title="Hapus Aktivitas">
                              <button
                                type="button"
                                onClick={() => {
                                  setActToDelete(act);
                                  setConfirmDelete(true);
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORM TAMBAH / EDIT AKTIVITAS                    */}
      {/* ======================================================== */}
      <Transition appear show={actModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setActModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 via-indigo-50/30 to-white">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0 ring-4 ring-purple-100">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                          {actModalMode === "edit" ? "Edit Aktivitas Kegiatan" : "Tambah Aktivitas Kegiatan"}
                        </Dialog.Title>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            actModalMode === "edit"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {actModalMode === "edit" ? "Mode Edit" : "Baru"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Kelola rincian nama kegiatan, penanggung jawab, dan alokasi anggaran
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActModalOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-xs border border-transparent hover:border-gray-200 transition cursor-pointer"
                    title="Tutup Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveActivity} className="p-6 overflow-y-auto space-y-5">
                  {/* Nama Aktivitas */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span>Nama Aktivitas / Kegiatan</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] font-medium text-gray-400">
                        {actNama.length} karakter
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Contoh: Pengadaan Server Rack & Penggantian Switch Distribusi Gedung Rektorat"
                      value={actNama}
                      onChange={(e) => setActNama(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition leading-relaxed placeholder:text-gray-400 shadow-2xs"
                    />
                  </div>

                  {/* PIC & Anggaran Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PIC Penanggung Jawab */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        PIC Penanggung Jawab
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Nama penanggung jawab kegiatan"
                          value={actPic}
                          onChange={(e) => setActPic(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Alokasi Anggaran Program */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Alokasi Anggaran Program (Rp)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-xs font-mono">
                          Rp
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={actAnggaranStr}
                          onChange={handleAnggaranInputChange}
                          className="w-full pl-11 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono font-bold text-gray-900 shadow-2xs placeholder:text-gray-400"
                        />
                      </div>
                      {actAnggaran > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">
                          Terbilang: {formatRupiah(actAnggaran)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Evaluasi & Pelaksanaan (Collapsible Card) */}
                  <div className="border border-gray-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setShowEvaluasi((prev) => !prev)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50/70 hover:bg-gray-100/70 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-gray-800">
                          Evaluasi & Catatan Pelaksanaan (Opsional)
                        </span>
                        {(actCapaian || actMasalah || actPemecahan) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Terisi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="text-[11px] font-medium text-gray-500">
                          {showEvaluasi ? "Sembunyikan" : "Tampilkan"}
                        </span>
                        {showEvaluasi ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {showEvaluasi && (
                      <div className="p-4 space-y-3.5 border-t border-gray-100 bg-white">
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Kolom evaluasi dapat diisi saat atau setelah kegiatan berjalan untuk pelaporan capaian dan tindak lanjut.
                        </p>
                        <div className="space-y-3">
                          {/* Capaian */}
                          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Capaian / Realisasi</span>
                              </label>
                              <span className="text-[10px] text-emerald-600 font-medium">
                                {actCapaian ? `${actCapaian.length} karakter` : "Hasil capaian"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan rincian capaian kegiatan yang telah tercapai..."
                              value={actCapaian}
                              onChange={(e) => setActCapaian(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>

                          {/* Kendala / Masalah */}
                          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>Kendala / Masalah</span>
                              </label>
                              <span className="text-[10px] text-amber-600 font-medium">
                                {actMasalah ? `${actMasalah.length} karakter` : "Hambatan pelaksanaan"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan hambatan atau kendala yang dihadapi selama kegiatan..."
                              value={actMasalah}
                              onChange={(e) => setActMasalah(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>

                          {/* Solusi Masalah */}
                          <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-indigo-600" />
                                <span>Solusi & Tindak Lanjut</span>
                              </label>
                              <span className="text-[10px] text-indigo-600 font-medium">
                                {actPemecahan ? `${actPemecahan.length} karakter` : "Rekomendasi solusi"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan solusi, penyelesaian masalah, atau rekomendasi perbaikan..."
                              value={actPemecahan}
                              onChange={(e) => setActPemecahan(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActModalOpen(false)}
                      disabled={savingAct}
                      className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition cursor-pointer shadow-2xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingAct}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25 transition active:scale-[0.99] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {savingAct ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{actModalMode === "edit" ? "Perbarui Aktivitas" : "Simpan Aktivitas"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>





      {/* Delete Activity Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteActivity}
        title="Hapus Aktivitas Kegiatan?"
        message={`Apakah Anda yakin ingin menghapus aktivitas "${actToDelete?.Aktivitas}"? Semua jadwal timeline dan berkas bukti terkait akan dihapus permanen.`}
      />
    </>
  );
}
