import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { ktsApi } from "@/Common/api";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const getStatusBadge = (status) => {
  switch (status) {
    case "belum_dibuat":
      return {
        label: "Belum Dibuat",
        className: "bg-gray-400 text-white",
        icon: Clock,
      };
    case "draf":
      return {
        label: "Draf",
        className: "bg-gray-600 text-white",
        icon: FileText,
      };
    case "menunggu_verif_auditee":
      return {
        label: "Menunggu Verifikasi Auditee",
        className: "bg-amber-500 text-white",
        icon: AlertTriangle,
      };
    case "tolak_auditee":
      return {
        label: "Tolak Auditee",
        className: "bg-rose-600 text-white",
        icon: XCircle,
      };
    case "terima_auditee":
      return {
        label: "Terima Auditee",
        className: "bg-emerald-600 text-white",
        icon: CheckCircle,
      };
    case "menunggu_penyelesaian":
      return {
        label: "Tunggu Penyelesaian",
        className: "bg-emerald-800 text-white",
        icon: Clock,
      };
    case "tindakan_penyelesaian":
      return {
        label: "Tindakan Penyelesaian",
        className: "bg-teal-600 text-white",
        icon: CheckCircle,
      };
    case "tutup_kts":
      return {
        label: "Tutup KTS (Closed)",
        className: "bg-blue-600 text-white",
        icon: CheckCircle,
      };
    default:
      return {
        label: status || "Belum Dibuat",
        className: "bg-gray-400 text-white",
        icon: Clock,
      };
  }
};

const PusatKtsPage = () => {
  const { uuidRenstra } = useParams();
  const navigate = useNavigate();
  const { getValidToken } = useAuth();
  const { addToast } = useToast();
  const {
    positionYear,
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const [renstraInfo, setRenstraInfo] = useState(null);
  const [temuanList, setTemuanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [activeTab, setActiveTab] = useState("auditor1"); // "auditor1" | "auditor2"
  const [searchTerm, setSearchTerm] = useState("");
  const [showLegend, setShowLegend] = useState(false);

  // Modal actions
  const [activeModal, setActiveModal] = useState(null); // 'terima' | 'tolak' | 'tindakan' | 'penyelesaian' | 'closing' | 'diketahui'
  const [selectedKts, setSelectedKts] = useState(null);
  const [modalForm, setModalForm] = useState({
    tindakanPerbaikan: "",
    keteranganTolak: "",
    tanggalPenyelesaian: new Date().toISOString().split("T")[0],
    tanggalClosing: new Date().toISOString().split("T")[0],
    tinjauanTindakanPerbaikan: "",
    tanggalClosingFinal: new Date().toISOString().split("T")[0],
    wmmUpmfUpmps: "",
  });
  const [submittingModal, setSubmittingModal] = useState(false);

  // Fetch Renstra Info & Temuan
  const loadData = async () => {
    if (!uuidRenstra) return;
    setLoading(true);

    try {
      const [infoData, temuanData] = await Promise.all([
        ktsApi.getRenstraInfo(uuidRenstra),
        ktsApi.getTemuan(uuidRenstra),
      ]);

      setRenstraInfo(infoData);
      setTemuanList(Array.isArray(temuanData) ? temuanData : []);
    } catch (err) {
      console.error("Gagal memuat data KTS:", err);
      addToast("error", err.message || "Gagal memuat data temuan KTS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uuidRenstra]);

  // Tab Filtering
  // Auditor 1: Temuan template_renstra x kts (where tugas = auditor1)
  const auditor1Data = useMemo(() => {
    return temuanList.filter((item) => {
      const tugas = (item.Tugas || "").toLowerCase().trim();
      return tugas === "auditor1" && item.Source === "renstra";
    });
  }, [temuanList]);

  // Auditor 2: ((template_renstra x kts) (where tugas = auditor2)) + ((template_dokumen_tambahan + kts) (where tugas = auditor2))
  const auditor2Data = useMemo(() => {
    return temuanList.filter((item) => {
      const tugas = (item.Tugas || "").toLowerCase().trim();
      return tugas === "auditor2" || item.Source === "dokumen_tambahan";
    });
  }, [temuanList]);

  const currentTabData = activeTab === "auditor1" ? auditor1Data : auditor2Data;

  // Filtered by search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return currentTabData;
    const term = searchTerm.toLowerCase();
    return currentTabData.filter((item) => {
      const standar = (item.NamaStandar || "").toLowerCase();
      const indikator = (item.Indikator || "").toLowerCase();
      const status = (item.Status || "").toLowerCase();
      const klasifikasi = (item.Klasifikasi || "").toLowerCase();
      return (
        standar.includes(term) ||
        indikator.includes(term) ||
        status.includes(term) ||
        klasifikasi.includes(term)
      );
    });
  }, [currentTabData, searchTerm]);

  // Generate KTS for single item
  const handleGenerateKts = async (item) => {
    const idKey =
      item.Source === "renstra"
        ? (item.RenstraNilaiUUID || item.RenstraNilaiID)
        : (item.DokumenTambahanUUID || item.DokumenTambahanID);
    setGeneratingId(idKey);

    try {
      const formData = new FormData();
      if (item.Source === "renstra") {
        if (item.RenstraNilaiUUID) {
          formData.append("renstra_nilai_uuid", item.RenstraNilaiUUID);
        } else if (item.RenstraNilaiID) {
          formData.append("renstra_nilai_id", item.RenstraNilaiID.toString());
        }
      } else if (item.Source === "dokumen_tambahan") {
        if (item.DokumenTambahanUUID) {
          formData.append("dokumen_tambahan_uuid", item.DokumenTambahanUUID);
        } else if (item.DokumenTambahanID) {
          formData.append("dokumen_tambahan_id", item.DokumenTambahanID.toString());
        }
      }

      await ktsApi.generateKts(formData);
      addToast("success", "Formulir KTS (Draf) berhasil dibuat");
      await loadData();
    } catch (err) {
      console.error("Gagal membuat formulir KTS:", err);
      addToast("error", err.message || "Gagal membuat formulir KTS");
    } finally {
      setGeneratingId(null);
    }
  };

  // Generate All KTS for active tab
  const handleGenerateAll = async () => {
    const uncreatedItems = currentTabData.filter((item) => item.Status === "belum_dibuat");
    if (uncreatedItems.length === 0) {
      addToast("info", "Semua temuan sudah memiliki formulir KTS");
      return;
    }

    if (!confirm(`Generate ${uncreatedItems.length} formulir KTS draf untuk tab ${activeTab === "auditor1" ? "Auditor 1" : "Auditor 2"}?`)) {
      return;
    }

    setGeneratingAll(true);
    let successCount = 0;
    const errors = [];

    try {
      for (const item of uncreatedItems) {
        try {
          const formData = new FormData();
          if (item.Source === "renstra") {
            if (item.RenstraNilaiUUID) {
              formData.append("renstra_nilai_uuid", item.RenstraNilaiUUID);
            } else if (item.RenstraNilaiID) {
              formData.append("renstra_nilai_id", item.RenstraNilaiID.toString());
            }
          } else if (item.Source === "dokumen_tambahan") {
            if (item.DokumenTambahanUUID) {
              formData.append("dokumen_tambahan_uuid", item.DokumenTambahanUUID);
            } else if (item.DokumenTambahanID) {
              formData.append("dokumen_tambahan_id", item.DokumenTambahanID.toString());
            }
          }

          await ktsApi.generateKts(formData);
          successCount++;
        } catch (itemErr) {
          console.error("Gagal generate item:", item, itemErr);
          errors.push(itemErr.message);
        }
      }

      if (successCount > 0) {
        addToast("success", `Berhasil membuat ${successCount} formulir KTS`);
        await loadData();
      }
      if (errors.length > 0) {
        addToast("error", `${errors.length} formulir gagal dibuat: ${errors[0]}`);
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Terjadi kesalahan saat generate massal");
    } finally {
      setGeneratingAll(false);
    }
  };

  // Download PDF KTS
  const handleDownload = async (item) => {
    if (!item.UUID) return;

    try {
      // 1. Publish KTS
      await ktsApi.publishKts(item.UUID);

      // 2. Export / Download
      const tahunParam = item.Tahun || renstraInfo?.Tahun || "2024";
      const filename = `KTS_${item.UUID.substring(0, 8)}.pdf`;
      await ktsApi.exportPdf(item.UUID, tahunParam, filename);

      addToast("success", "Dokumen KTS berhasil diunduh");
    } catch (err) {
      console.error("Gagal mengunduh berkas:", err);
      addToast("error", err.message || "Terjadi kesalahan saat mengunduh berkas");
    }
  };

  // Open modal workflow
  const openActionModal = (type, item) => {
    setSelectedKts(item);
    setActiveModal(type);
    setModalForm({
      tindakanPerbaikan: item.TindakanPerbaikan || "",
      keteranganTolak: item.KeteranganTolakAuditee || "",
      tanggalPenyelesaian: new Date().toISOString().split("T")[0],
      tanggalClosing: new Date().toISOString().split("T")[0],
      tinjauanTindakanPerbaikan: "",
      tanggalClosingFinal: new Date().toISOString().split("T")[0],
      wmmUpmfUpmps: "",
    });
  };

  // Submit Modal Workflow
  const submitWorkflowModal = async (e) => {
    e.preventDefault();
    if (!selectedKts?.UUID) return;
    setSubmittingModal(true);

    try {
      const formData = new FormData();
      const tahun = selectedKts.Tahun || renstraInfo?.Tahun || "2024";

      if (activeModal === "terima") {
        formData.append("step", "step2");
        formData.append("statusAccAuditee", "1");
        formData.append("tindakanPerbaikan", modalForm.tindakanPerbaikan);
      } else if (activeModal === "tolak") {
        formData.append("step", "step2");
        formData.append("statusAccAuditee", "0");
        formData.append("keteranganTolak", modalForm.keteranganTolak);
      } else if (activeModal === "tindakan") {
        formData.append("step", "step2R");
        formData.append("tindakanPerbaikan", modalForm.tindakanPerbaikan);
      } else if (activeModal === "penyelesaian") {
        formData.append("step", "step3");
        formData.append("tanggalPenyelesaian", modalForm.tanggalPenyelesaian);
      } else if (activeModal === "closing") {
        formData.append("step", "step4");
        formData.append("tanggalClosing", modalForm.tanggalClosing);
        formData.append("tinjauanTindakanPerbaikan", modalForm.tinjauanTindakanPerbaikan);
      } else if (activeModal === "diketahui") {
        formData.append("step", "step5");
        formData.append("tanggalClosingFinal", modalForm.tanggalClosingFinal);
        formData.append("wmmUpmfUpmps", modalForm.wmmUpmfUpmps);
      }

      await ktsApi.updateWorkflow(tahun, selectedKts.UUID, formData);
      addToast("success", "Status KTS berhasil diperbarui");
      setActiveModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      addToast("error", err.message || "Gagal memperbarui status KTS");
    } finally {
      setSubmittingModal(false);
    }
  };

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

      <div className="p-4 bg-gray-50/50 min-h-[calc(100vh-64px)] w-full">
        {/* ================= HEADER & BREADCRUMB ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/schedule_audit")}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition text-gray-700 bg-white shadow-xs"
              title="Kembali ke Schedule Audit"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="hover:underline cursor-pointer" onClick={() => navigate("/schedule_audit")}>
                  Schedule Audit
                </span>
                <span>/</span>
                <span className="text-purple-600 font-medium">Pusat KTS</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Pusat KTS
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
              Muat Ulang
            </button>

            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition shadow-xs"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Panduan Status</span>
              {showLegend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ================= INFO CARD RENSTRA SUMMARY ================= */}
        {renstraInfo && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block mb-0.5">Unit / Fakultas Diaudit:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {renstraInfo?.Target || renstraInfo?.FakultasUnit || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Tahun Periode:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {renstraInfo?.Tahun || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Auditor 1 (Utama):</span>
                <span className="font-semibold text-gray-900">
                  {renstraInfo?.NamaAuditor1 || renstraInfo?.Auditor1 || "Belum Ditugaskan"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Auditor 2 (Tambahan):</span>
                <span className="font-semibold text-gray-900">
                  {renstraInfo?.NamaAuditor2 || renstraInfo?.Auditor2 || "Belum Ditugaskan"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= INFORMASI STATUS KTS (LEGEND) ================= */}
        {showLegend && (
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden shadow-xs transition-all animate-in fade-in duration-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600" />
                Informasi & Alur Status KTS
              </h3>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Tutup
              </button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100/60 text-gray-600 font-medium">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">No</th>
                    <th className="py-2 px-3 w-48">Status Badge</th>
                    <th className="py-2 px-3">Penjelasan & Alur Proses</th>
                    <th className="py-2 px-3 w-44">Aktor Terkait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">1</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-400 text-white inline-block">
                        Belum Dibuat
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Temuan evaluasi (klasifikasi bukan <i>"OK"</i>) terdeteksi pada Renstra / Dokumen Tambahan, namun formulir KTS belum di-generate oleh Auditor ke sistem.
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-600">Auditor: Buat Formulir KTS</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">2</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-600 text-white inline-block">
                        Draf
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Data KTS telah digenerate oleh Auditor dan berstatus draf. Auditor masih dapat mengedit atau melengkapi rincian temuan sebelum dikirimkan ke Auditee.
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-600">Auditor: Edit Formulir</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">3</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500 text-white inline-block">
                        Menunggu Verifikasi Auditee
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Laporan temuan KTS telah diajukan ke pihak Auditee. Auditee perlu memverifikasi apakah menyetujui temuan tersebut atau menolaknya.
                    </td>
                    <td className="py-2 px-3 font-medium text-amber-700">Auditee: Terima / Tolak</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">4</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-600 text-white inline-block">
                        Tolak Auditee
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Temuan KTS ditolak/disanggah oleh Auditee beserta catatan alasan penolakan. Auditor perlu meninjau kembali alasan penolakan untuk perbaikan draf temuan.
                    </td>
                    <td className="py-2 px-3 font-medium text-rose-700">Auditor: Tinjau Alasan</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">5</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white inline-block">
                        Terima Auditee
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Temuan KTS telah diverifikasi dan disetujui oleh Auditee. Temuan siap diproses lebih lanjut ke tahap penyusunan tindakan perbaikan.
                    </td>
                    <td className="py-2 px-3 font-medium text-emerald-700">Auditor: Penyelesaian</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">6</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-800 text-white inline-block">
                        Tunggu Penyelesaian
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      KTS telah disetujui masuk masa penyelesaian. Auditee wajib merumuskan rencana tindakan perbaikan (korektif dan preventif).
                    </td>
                    <td className="py-2 px-3 font-medium text-emerald-800">Auditee: Isi Tindakan</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">7</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-600 text-white inline-block">
                        Tindakan Penyelesaian
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Auditee telah mengisi rencana/tindakan perbaikan yang dilakukan. Auditor akan mengevaluasi bukti perbaikan sebelum menutup temuan KTS.
                    </td>
                    <td className="py-2 px-3 font-medium text-teal-700">Auditor: Closing</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center font-bold">8</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-600 text-white inline-block">
                        Tutup KTS (Closed)
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      Tindakan perbaikan telah diverifikasi dan disetujui penuh oleh Auditor. Temuan KTS resmi dinyatakan selesai (Closed).
                    </td>
                    <td className="py-2 px-3 font-medium text-blue-700">Download Berkas Resmi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= CARD KONTEN UTAMA ================= */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          {/* TABS HEADER */}
          <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("auditor1")}
                className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition -mb-px ${
                  activeTab === "auditor1"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>Auditor 1</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === "auditor1"
                      ? "bg-purple-100 text-purple-700 font-bold"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {auditor1Data.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("auditor2")}
                className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition -mb-px ${
                  activeTab === "auditor2"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>Auditor 2</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === "auditor2"
                      ? "bg-purple-100 text-purple-700 font-bold"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {auditor2Data.length}
                </span>
              </button>
            </div>

            {/* TAB TOOLBAR: SEARCH & GENERATE ALL */}
            <div className="flex items-center gap-2 pb-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari indikator / standar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {currentTabData.some((t) => t.Status === "belum_dibuat") && (
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={generatingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition shadow-xs disabled:opacity-50 whitespace-nowrap"
                  title="Generate formulir KTS draf untuk semua temuan yang belum dibuat"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingAll ? "Membuat..." : "Generate Semua KTS"}</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB DESCRIPTION BAR */}
          <div className="bg-purple-50/40 px-4 py-2 border-b border-gray-100 text-xs text-purple-900 flex items-center justify-between">
            <span>
              {activeTab === "auditor1" ? (
                <>
                  Menampilkan temuan <b>Template Renstra × KTS</b> (Tugas: <b>Auditor 1</b>) pada unit yang sedang diakses.
                </>
              ) : (
                <>
                  Menampilkan temuan <b>(Template Renstra × KTS)</b> + <b>(Template Dokumen Tambahan × KTS)</b> (Tugas: <b>Auditor 2</b>) pada unit yang sedang diakses.
                </>
              )}
            </span>
            <span className="text-gray-500">
              Total Temuan: <b>{currentTabData.length}</b>
            </span>
          </div>

          {/* TAB CONTENT TABLE */}
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                <p className="text-sm">Memuat data temuan KTS...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 stroke-[1.5]" />
                <p className="text-sm font-semibold text-gray-700">Tidak ada temuan KTS</p>
                <p className="text-xs text-gray-500 max-w-sm text-center mt-1">
                  Semua indikator pada tab {activeTab === "auditor1" ? "Auditor 1" : "Auditor 2"} berstatus OK atau belum ada data evaluasi bernilai temuan.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100/75 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-44">Status</th>
                    <th className="py-2.5 px-3 w-28">Sumber</th>
                    <th className="py-2.5 px-3 w-48">Nama Standar</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Indikator / Pertanyaan</th>
                    <th className="py-2.5 px-3 w-24 text-center">Klasifikasi</th>
                    <th className="py-2.5 px-3 w-24">Keterangan</th>
                    <th className="py-2.5 px-3 w-44">Keterangan Tolak Auditee</th>
                    <th className="py-2.5 px-3 w-36 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredData.map((item, idx) => {
                    const badge = getStatusBadge(item.Status);
                    const isDokumen = item.Source === "dokumen_tambahan";
                    const isGeneratingThis =
                      generatingId ===
                      (item.Source === "renstra"
                        ? (item.RenstraNilaiUUID || item.RenstraNilaiID)
                        : (item.DokumenTambahanUUID || item.DokumenTambahanID));

                    return (
                      <tr key={item.ID || `temuan-${idx}`} className="hover:bg-gray-50/70 transition">
                        {/* 1. INDEX */}
                        <td className="py-2.5 px-3 text-center font-medium text-gray-400">
                          {idx + 1}
                        </td>

                        {/* 2. STATUS BADGE */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs ${badge.className}`}
                          >
                            <badge.icon className="w-3 h-3 shrink-0" />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* 3. SUMBER */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                              isDokumen
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isDokumen ? "Dok. Tambahan" : "Renstra"}
                          </span>
                        </td>

                        {/* 4. NAMA STANDAR */}
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {item.NamaStandar || (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>

                        {/* 5. INDIKATOR */}
                        <td className="py-2.5 px-3">
                          <p className="line-clamp-3 font-medium text-gray-800">
                            {item.Indikator || "-"}
                          </p>
                          {item.TindakanPerbaikan && (
                            <div className="mt-1 p-1.5 bg-gray-50 rounded text-[11px] border border-gray-100">
                              <span className="font-semibold text-gray-600 block">
                                Tindakan Perbaikan:
                              </span>
                              <span className="text-gray-700">{item.TindakanPerbaikan}</span>
                            </div>
                          )}
                        </td>

                        {/* 6. KLASIFIKASI */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] capitalize ${
                              item.Klasifikasi === "major"
                                ? "bg-rose-100 text-rose-700"
                                : item.Klasifikasi === "observe"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {item.Klasifikasi || "-"}
                          </span>
                        </td>

                        {/* 7. KETERANGAN */}
                        <td className="py-2.5 px-3 font-medium">
                          {item.Keterangan === "Close" ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-bold">
                              Close
                            </span>
                          ) : (
                            item.Keterangan || "-"
                          )}
                        </td>

                        {/* 8. KETERANGAN TOLAK */}
                        <td className="py-2.5 px-3 text-rose-700">
                          {item.KeteranganTolakAuditee ? (
                            <span className="bg-rose-50 border border-rose-100 p-1 rounded block text-[11px]">
                              {item.KeteranganTolakAuditee}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 9. AKSI */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {/* BELUM DIBUAT -> TOMBOL BUAT KTS */}
                            {item.Status === "belum_dibuat" && (
                              <button
                                type="button"
                                onClick={() => handleGenerateKts(item)}
                                disabled={isGeneratingThis}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition shadow-2xs disabled:opacity-50"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{isGeneratingThis ? "Membuat..." : "Buat KTS"}</span>
                              </button>
                            )}

                            {/* DRAF / TOLAK AUDITEE -> EDIT KTS */}
                            {item.UUID && (item.Status === "draf" || item.Status === "tolak_auditee") && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/kts/${item.Tahun || renstraInfo?.Tahun || "2024"}/${
                                      item.TargetUUID || renstraInfo?.TargetUuid || "all"
                                    }/${uuidRenstra}`
                                  )
                                }
                                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition"
                                title="Edit Formulir KTS"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Edit KTS</span>
                              </button>
                            )}

                            {/* MENUNGGU VERIF AUDITEE -> TERIMA & TOLAK */}
                            {item.UUID && item.Status === "menunggu_verif_auditee" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("terima", item)}
                                  className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition"
                                >
                                  Terima
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("tolak", item)}
                                  className="px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition"
                                >
                                  Tolak
                                </button>
                              </>
                            )}

                            {/* TERIMA AUDITEE -> PENYELESAIAN (Auditor) & UBAH TINDAKAN */}
                            {item.UUID && item.Status === "terima_auditee" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("penyelesaian", item)}
                                  className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition"
                                >
                                  Penyelesaian
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("tindakan", item)}
                                  className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition"
                                >
                                  Ubah Tindakan
                                </button>
                              </>
                            )}

                            {/* MENUNGGU PENYELESAIAN -> CLOSING & UBAH TINDAKAN */}
                            {item.UUID && item.Status === "menunggu_penyelesaian" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("closing", item)}
                                  className="px-2 py-1 text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-md transition"
                                >
                                  Closing
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("tindakan", item)}
                                  className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition"
                                >
                                  Ubah Tindakan
                                </button>
                              </>
                            )}

                            {/* TINDAKAN PENYELESAIAN -> DIKETAHUI */}
                            {item.UUID && item.Status === "tindakan_penyelesaian" && (
                              <button
                                type="button"
                                onClick={() => openActionModal("diketahui", item)}
                                className="px-2 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition"
                              >
                                Diketahui
                              </button>
                            )}

                            {/* DOWNLOAD BERKAS (Jika bukan draf, tolak, atau belum_dibuat) */}
                            {item.UUID &&
                              !["draf", "tolak_auditee", "belum_dibuat"].includes(item.Status) && (
                                <button
                                  type="button"
                                  onClick={() => handleDownload(item)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition"
                                  title="Download Berkas KTS PDF"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Unduh</span>
                                </button>
                              )}

                            {/* VIEW FORM KTS (Link ke halaman editor) */}
                            {item.UUID && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/kts/${item.Tahun || renstraInfo?.Tahun || "2024"}/${
                                      item.TargetUUID || renstraInfo?.TargetUuid || "all"
                                    }/${uuidRenstra}`
                                  )
                                }
                                className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                                title="Buka Detail Form KTS"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL WORKFLOW ACTIONS ================= */}
      {activeModal && selectedKts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h4 className="font-semibold text-sm text-gray-900">
                {activeModal === "terima" && "Terima Dokumen Audit KTS"}
                {activeModal === "tolak" && "Tolak Dokumen Audit KTS"}
                {activeModal === "tindakan" && "Update Tindakan Perbaikan"}
                {activeModal === "penyelesaian" && "Form Penyelesaian KTS"}
                {activeModal === "closing" && "Form Closing KTS"}
                {activeModal === "diketahui" && "Closing Final Dokumen Audit"}
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitWorkflowModal} className="p-5 space-y-4 text-xs">
              {/* MODAL TERIMA & TINDAKAN */}
              {(activeModal === "terima" || activeModal === "tindakan") && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tindakan Perbaikan / Koreksi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={modalForm.tindakanPerbaikan}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, tindakanPerbaikan: e.target.value })
                    }
                    placeholder="Tuliskan rencana tindakan perbaikan dan pencegahan..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                  />
                </div>
              )}

              {/* MODAL TOLAK */}
              {activeModal === "tolak" && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Alasan Penolakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={modalForm.keteranganTolak}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, keteranganTolak: e.target.value })
                    }
                    placeholder="Tuliskan alasan penolakan temuan audit..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                  />
                </div>
              )}

              {/* MODAL PENYELESAIAN */}
              {activeModal === "penyelesaian" && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tanggal Penyelesaian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalForm.tanggalPenyelesaian}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, tanggalPenyelesaian: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                  />
                </div>
              )}

              {/* MODAL CLOSING */}
              {activeModal === "closing" && (
                <>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Tanggal Closing <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={modalForm.tanggalClosing}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, tanggalClosing: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Tinjauan Tindakan Perbaikan <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={modalForm.tinjauanTindakanPerbaikan}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          tinjauanTindakanPerbaikan: e.target.value,
                        })
                      }
                      placeholder="Tinjauan auditor terhadap perbaikan..."
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                    />
                  </div>
                </>
              )}

              {/* MODAL FINAL CLOSING / DIKETAHUI */}
              {activeModal === "diketahui" && (
                <>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Tanggal Closing Final <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={modalForm.tanggalClosingFinal}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, tanggalClosingFinal: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      WMM / UPMF / UPMPS
                    </label>
                    <input
                      type="text"
                      value={modalForm.wmmUpmfUpmps}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, wmmUpmfUpmps: e.target.value })
                      }
                      placeholder="Nama atau jabatan penanggung jawab..."
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={submittingModal}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submittingModal ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PusatKtsPage;
