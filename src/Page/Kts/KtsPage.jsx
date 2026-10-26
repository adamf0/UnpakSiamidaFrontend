import React, { useEffect, useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { cn, isEmpty, isNumeric } from "@/Common/Utils";
import ErrorImg from "@/assets/data-breach.png";
import { useParams } from "react-router-dom";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useForm } from "react-hook-form";
import RestrictedCkEditor from "@/Components/RestrictedCkEditor";
import TextInput from "@/Components/TextInput";
import Choice from "@/Components/Choice";
import InfoAuditCard from "@/Components/InfoAuditCard";
import { apiClient, API_BASE_URL, ktsApi } from "@/Common/api";
import {
  Download,
  ShieldCheck,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";

const decodeJWT = (jwt) => {
  if (!jwt || typeof jwt !== "string") return null;
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binString = atob(base64);
    try {
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return JSON.parse(binString);
    }
  } catch {
    return null;
  }
};

const getSID = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("refresh");
  if (!token) return null;

  const clean = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  const payload = decodeJWT(clean);
  return payload?.sid || null;
};

function ruleAllowAccess(row, currentLevel, info, currentUser, readOnly = false) {
  if (readOnly) {
    return true;
  }
  const userLevel = (currentLevel || currentUser?.level || "").toLowerCase().trim();

  // 1. Admin always has full access
  if (userLevel === "admin") {
    return true;
  }

  // 2. Identify current user SID / UUID
  const sid = currentUser?.uuid || getSID();
  if (!sid) {
    return false;
  }

  // 3. Match against row's AuditorUuid or AuditeeUuid
  if (sid === row?.AuditorUuid || sid === row?.AuditeeUuid) {
    return true;
  }

  // 4. Match against audit schedule (renstra) assigned auditors & auditee
  if (info) {
    if (
      sid === info.Auditor1Uuid ||
      sid === info.Auditor2Uuid ||
      sid === info.AuditeeUuid
    ) {
      return true;
    }
  }

  // 5. If user has auditor/auditee role in the active session
  if (userLevel === "auditor1" || userLevel === "auditor2" || userLevel === "auditee") {
    return true;
  }

  return false;
}

function renderStatus(currentStatus) {
  const showUbahTindakan = {
    draf: false,
    menunggu_verif_auditee: false,
    terima_auditee: true,
    menunggu_penyelesaian: true,
    tindakan_penyelesaian: true,
    tutup_kts: true,
    tolak_auditee: true,
  };

  const actionMap = {
    draf: "Edit",
    menunggu_verif_auditee: "Approval Auditee",
    terima_auditee: "Penyelesaian",
    menunggu_penyelesaian: "Closing",
    tindakan_penyelesaian: "Diketahui",
  };

  const statusMap = {
    draf: "Draf",
    menunggu_verif_auditee: "Menunggu Verifikasi Auditee",
    terima_auditee: "Terima Auditee",
    menunggu_penyelesaian: "Tunggu Penyelesaian",
    tindakan_penyelesaian: "Tindakan Penyelesaian",
    tutup_kts: "Tutup KTS",
    tolak_auditee: "Tolak Auditee",
  };

  const styleMap = {
    draf: "bg-gray-600 text-white",
    tolak: "bg-red-500/70 text-white",
    menunggu_verif_auditee: "bg-orange-500/90 text-white",
    tolak_auditee: "bg-red-500/70 text-white",
    terima_auditee: "bg-emerald-600 text-white",
    menunggu_penyelesaian: "bg-emerald-900 text-white",
    tindakan_penyelesaian: "bg-emerald-600 text-white",
    tutup_kts: "bg-blue-600 text-white",
  };

  const action = actionMap[currentStatus];
  const status = statusMap[currentStatus];
  const style = styleMap[currentStatus];
  const visibleUbahTindakan = showUbahTindakan[currentStatus];

  if (!status) return null;

  return { action, status, style, visibleUbahTindakan };
}

/* =========================
   PAGE
========================= */
const KtsPage = ({
  tahun: propTahun,
  target: propTarget,
  uuidaudit: propUuidaudit,
  readOnly = false,
  hideNavbar = false,
} = {}) => {
  const params = useParams();
  const tahun = propTahun || params.tahun;
  const target = propTarget || params.target;
  const uuidaudit = propUuidaudit || params.uuidaudit;
  const { user, getValidToken } = useAuth();
  const { addToast } = useToast();
  const {
    positionYear,
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const [data, setData] = useState([]);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  // selected row (detail kiri)
  const [selectedRow, setSelectedRow] = useState(null);
  const [positionStatus, setPositionStatus] = useState(null);
  const [isUbahTindakan, setIsUbahTindakan] = useState(false);

  // popper action
  const [activeActionId, setActiveActionId] = useState(null);
  const [onlyAllowed, setOnlyAllowed] = useState(false);
  const filteredData = (!readOnly && onlyAllowed)
    ? data.filter((row) => ruleAllowAccess(row, level, info, user, readOnly))
    : data;

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0 && !selectedRow) {
      setSelectedRow(data[0]);
    }
  }, [data, selectedRow]);

  const fetchData = async () => {
    setLoading(true);

    const token = getValidToken();
    const errors = [];

    try {
      const infoPromise = (async () => {
        try {
          const res = await apiClient.get(`/renstra/${uuidaudit}`);
          setInfo(res?.data ?? res);
        } catch (err) {
          errors.push({
            url: `/renstra/${uuidaudit}`,
            message: err?.message || "Gagal memuat info KTS",
            time: new Date().toISOString(),
            raw: err,
          });
        }
      })();

      const ssePromise = (async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/Ktss?mode=sse&filters=targetuuid:eq:${target};tahun:eq:${tahun};`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "text/event-stream",
              },
            },
          );

          if (!res.ok || !res.body) {
            throw new Error(`SSE HTTP ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          const data = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;

              const payload = line.replace("data:", "").trim();
              if (payload === "start" || payload === "done") continue;

              data.push(JSON.parse(payload));
            }
          }

          setData(data);
          if (Array.isArray(data) && data.length > 0) {
            setSelectedRow((prev) => prev || data[0]);
          }
        } catch (err) {
          errors.push({
            url: err.__url,
            message: err.message || "Gagal memuat data",
            time: new Date().toISOString(),
            raw: err,
          });
        }
      })();

      await Promise.all([infoPromise, ssePromise]);
      if (errors.length > 0) {
        setError(errors);
        errors.forEach((e) => console.error(e));
        addToast("error", "Sebagian data gagal dimuat");
      }
    } finally {
      setLoading(false);
    }
  };

  function renderContent() {
    if (!selectedRow) return null;

    // Mode read-only (Riwayat Audit) atau KTS yang sudah selesai/tutup: Tampilkan SELURUH field input
    if (readOnly || selectedRow.Status === "tutup_kts") {
      return (
        <KtsFullDetailForm
          data={selectedRow}
          readOnly={true}
          onDownload={() => downloadHandler(selectedRow)}
        />
      );
    }

    const statusMap = {
      draf: KtsForm1,
      menunggu_verif_auditee: KtsForm2,
      terima_auditee: KtsForm3,
      menunggu_penyelesaian: KtsForm4,
      tindakan_penyelesaian: KtsForm5,
      tutup_kts: KtsFullDetailForm,
      tolak_auditee: KtsFullDetailForm,
    };
    const isAvailableEdit = [
      "menunggu_penyelesaian",
      "tindakan_penyelesaian",
      "tutup_kts",
      "tolak_auditee",
      "terima_auditee",
    ].includes(selectedRow?.Status);

    const Component = statusMap[selectedRow?.Status] || KtsForm1;
    if (!Component) return null;

    if (isAvailableEdit && isUbahTindakan && !readOnly) {
      return <KtsForm2 data={selectedRow} isUbahTindakan={isUbahTindakan} readOnly={readOnly} />;
    }

    return <Component data={selectedRow} readOnly={readOnly} />;
  }

  const downloadHandler = async (row) => {
    if (!row?.UUID) return;
    try {
      await ktsApi.publishKts(row.UUID);
      const tahunParam = row.Tahun || tahun || positionYear || "2024";
      const filename = `KTS_${row.UUID.substring(0, 8)}.pdf`;
      await ktsApi.exportPdf(row.UUID, tahunParam, filename);
      addToast("success", "Dokumen KTS berhasil diunduh");
    } catch (err) {
      console.error("Gagal mengunduh KTS:", err);
      addToast("error", err.message || "Gagal mengunduh dokumen KTS");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // close popper when click outside
  useEffect(() => {
    const close = () => setActiveActionId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <>
      {!hideNavbar && (
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
      )}

      <div className="p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">KTS Audit</h2>

        {loading && <div className="text-gray-500">Loading...</div>}

        {/* ================= GRID UTAMA ================= */}
        <div
          className={`
            grid gap-4
            grid-cols-1
            sm:grid-cols-[1fr_360px]
            ${hideNavbar ? "sm:h-[calc(100vh-230px)] sm:min-h-[500px]" : "sm:h-[calc(100vh-140px)] sm:min-h-[550px]"}
          `}
        >
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* ================= CARD 1 ================= */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 shrink-0 max-h-[220px] overflow-y-auto bg-white shadow-2xs">
              <InfoAuditCard info={info} />
            </div>

            {/* ================= CARD 2 ================= */}
            <div
              className={`border border-gray-200 rounded-xl p-3 sm:p-4 overflow-hidden flex flex-col flex-1 min-h-0 bg-white shadow-2xs ${
                !selectedRow ? "justify-center items-center" : ""
              }`}
            >
              {/* Mobile */}
              <div className="sm:hidden flex gap-4 overflow-x-auto">
                {selectedRow ? (
                  <div className="min-w-full">{renderContent()}</div>
                ) : (
                  <div className="text-gray-400 text-sm">Pilih data KTS</div>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block flex-1 min-h-0 overflow-y-auto pr-1">
                {!selectedRow ? (
                  <div className="text-gray-400 text-sm">
                    {data && data.length > 0
                      ? "Pilih salah satu temuan KTS di samping untuk melihat rincian seluruh field"
                      : "Belum ada catatan temuan KTS pada jadwal audit ini"}
                  </div>
                ) : (
                  renderContent()
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto h-full min-h-0 pr-1">
            <div
              onClick={() => setOnlyAllowed(!onlyAllowed)}
              className={`flex items-start gap-3 rounded-lg border p-3 mb-4 cursor-pointer transition ${onlyAllowed ? "bg-purple-50 border-purple-400" : "hover:bg-gray-50"}`}
            >
              <div
                className={`w-4 h-4 mt-1 rounded border flex items-center justify-center ${onlyAllowed ? "bg-purple-600 border-purple-600" : "border-gray-400"}`}
              >
                {onlyAllowed && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Tampilkan hanya yang memiliki akses
                </span>
                <span className="text-xs text-gray-500">
                  Filter berdasarkan auditee atau auditor yg dimiliki
                </span>
              </div>
            </div>

            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <CardKts
                  key={row.UUID}
                  row={row}
                  onDownload={downloadHandler}
                  tahun={tahun || positionYear}
                  level={level}
                  user={user}
                  info={info}
                  readOnly={readOnly}
                  activeActionId={activeActionId}
                  setActiveActionId={setActiveActionId}
                  onEdit={(row) => setSelectedRow(row)}
                  onChangePosition={(status, ubahTindakan) => {
                    if (readOnly) return;
                    console.log(status, ubahTindakan);
                    setPositionStatus(status);
                    setIsUbahTindakan(ubahTindakan);
                  }}
                  isActive={selectedRow?.UUID == row.UUID}
                />
              ))
            ) : (
              <div class="border rounded-lg p-4 h-screen flex justify-center items-center">
                <div class="text-gray-400 text-sm">Tidak ada data kts</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default KtsPage;

/* =========================
   CARD
========================= */
function CardKts({
  row,
  tahun,
  level,
  user,
  info,
  activeActionId,
  setActiveActionId,
  onEdit,
  onChangePosition,
  isActive = false,
  onDownload,
  readOnly = false,
}) {
  const isRenstraNilai =
    !isNumeric(row?.RenstraNilai) && isNumeric(row?.DokumenTambahan);
  const isDokumenTambahan =
    isNumeric(row?.RenstraNilai) && !isNumeric(row?.DokumenTambahan);
  const isNotMatch =
    !isNumeric(row?.RenstraNilai) && !isNumeric(row?.DokumenTambahan);
  const isSameYear = row.Tahun == tahun;

  function renderContent() {
    if (isDokumenTambahan) {
      return (
        <>
          <p className="font-medium text-sm mb-2 line-clamp-3">
            {row.Indikator ?? "-"}
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-semibold">Standar:</span>{" "}
              {row.Standar ?? "-"}
            </div>
            <div>
              <span className="font-semibold">Target:</span> {row.Target ?? "-"}
            </div>
          </div>
        </>
      );
    }

    if (isRenstraNilai) {
      return (
        <>
          <p className="font-medium text-sm mb-2 line-clamp-3">
            {row.Pertanyaan ?? "-"}
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-semibold">Jenis File:</span>{" "}
              {row.JenisFile ?? "-"}
            </div>
            <div>
              <span className="font-semibold">Target:</span> {row.Target ?? "-"}
            </div>
          </div>
        </>
      );
    }
  }

  const { action, status, style, visibleUbahTindakan } = renderStatus(
    row.Status,
  );

  return (
    <div
      onClick={() => onEdit && onEdit(row)}
      className={`border ${isActive ? "border-green-500" : ""} rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer`}
    >
      {isNotMatch ? (
        <div className="flex flex-col items-center text-center gap-3 p-6">
          <img src={ErrorImg} alt="error" className="w-32" />
          <h2 className="text-base font-semibold text-gray-800">
            Ada masalah pada aplikasi
          </h2>
          <p className="text-sm text-gray-500">
            {isSameYear
              ? "Terjadi kesalahan pada data KTS, silahkan hubungi administrator"
              : "Data KTS tidak sesuai dengan tahun audit"}
          </p>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="flex justify-between items-start mb-2">
            <span className={cn(`text-xs px-2 py-1 rounded`, style)}>
              {status}
            </span>

            {/* ACTION */}
            {ruleAllowAccess(row, level, info, user, readOnly) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionId(
                      activeActionId === row.UUID ? null : row.UUID,
                    );
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <BsThreeDotsVertical />
                </button>

                {activeActionId === row.UUID && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="
                    absolute right-0 mt-1 w-52
                    bg-white border rounded shadow-lg z-20
                  "
                  >
                    {!readOnly && action && (
                      <ActionItem
                        label={action}
                        danger={action == "Closing"}
                        onClick={() => {
                          setActiveActionId(null);
                          onEdit(row);
                          onChangePosition(null, false);
                        }}
                      />
                    )}
                    {!readOnly && visibleUbahTindakan && "auditee" == level && (
                      <ActionItem
                        label="Ubah Tindakan"
                        onClick={() => {
                          setActiveActionId(null);
                          onChangePosition("menunggu_verif_auditee", true);
                          onEdit(row);
                        }}
                      />
                    )}
                    {!readOnly && action && <Divider />}
                    <ActionItem
                      label="Download"
                      onClick={() => {
                        setActiveActionId(null);
                        onDownload(row);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONTENT */}
          {renderContent()}
        </>
      )}
    </div>
  );
}

function ActionItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`
        block w-full text-left px-3 py-2 text-sm
        hover:bg-gray-100
        ${danger ? "text-red-600 hover:bg-red-50" : ""}
      `}
    >
      {label}
    </button>
  );
}

/* =========================================================================
   KTS FULL DETAIL FORM (MENAMPILKAN SELURUH FIELD INPUT KTS SECARA LENGKAP)
   Digunakan pada mode read-only (Riwayat Audit) dan status Tutup KTS
   sehingga pengguna melihat seluruh isi temuan, tanggapan, dan penutupan,
   tidak stuck hanya pada form PLOR.
========================================================================= */
export function KtsFullDetailForm({ data, readOnly = true, onDownload }) {
  const { control, reset, watch } = useForm({
    defaultValues: {
      NomorLaporan: "",
      TanggalLaporan: "",
      KetidaksesuaianP: "",
      KetidaksesuaianL: "",
      KetidaksesuaianO: "",
      KetidaksesuaianR: "",
      AkarMasalah: "",
      TindakanKoreksi: "",
      Status: null,
      KeteranganTolak: "",
      TindakanPerbaikan: "",
      TanggalPenyelesaian: "",
      TanggalClosing: "",
      TinjauanTindakanPerbaikan: "",
      TanggalClosingFinal: "",
      WmmUpmfUpmps: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!data?.UUID) return;
    const formatDt = (val) => {
      if (!val) return "";
      if (typeof val === "string" && val.includes("T")) return val.split("T")[0];
      return String(val);
    };

    reset({
      NomorLaporan: data.NomorLaporan ?? "",
      TanggalLaporan: formatDt(data.TanggalLaporan),
      KetidaksesuaianP: data.KetidaksesuaianP ?? "",
      KetidaksesuaianL: data.KetidaksesuaianL ?? "",
      KetidaksesuaianO: data.KetidaksesuaianO ?? "",
      KetidaksesuaianR: data.KetidaksesuaianR ?? "",
      AkarMasalah: data.AkarMasalah ?? "",
      TindakanKoreksi: data.TindakanKoreksi ?? "",
      Status:
        data.StatusAccAuditee !== undefined && data.StatusAccAuditee !== null
          ? String(data.StatusAccAuditee)
          : null,
      KeteranganTolak: data.KeteranganTolak ?? "",
      TindakanPerbaikan: data.TindakanPerbaikan ?? "",
      TanggalPenyelesaian: formatDt(data.TanggalPenyelesaian),
      TanggalClosing: formatDt(data.TanggalClosing),
      TinjauanTindakanPerbaikan: data.TinjauanTindakanPerbaikan ?? "",
      TanggalClosingFinal: formatDt(data.TanggalClosingFinal),
      WmmUpmfUpmps: formatDt(data.WmmUpmfUpmps),
    });
  }, [data]);

  const statusLabel = (data?.Status || "").replace(/_/g, " ").toUpperCase();

  return (
    <div className="flex flex-col gap-5 p-1 pb-8">
      {/* HEADER RINGKASAN TEMUAN */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-200 text-purple-900 border border-purple-300">
              Laporan KTS Lengkap
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200 shadow-2xs">
              Status: {statusLabel || "DRAF"}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {data?.Indikator || data?.Pertanyaan || "Temuan Ketidaksesuaian"}
          </h3>
          <p className="text-xs text-gray-600">
            {data?.Standar && (
              <span>
                Standar: <strong>{data.Standar}</strong>
              </span>
            )}
            {data?.JenisFile && (
              <span>
                Jenis File: <strong>{data.JenisFile}</strong>
              </span>
            )}
            {data?.Target && <span> • Target: {data.Target}</span>}
          </p>
        </div>

        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="self-start sm:self-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF</span>
          </button>
        )}
      </div>

      {/* ================= BAGIAN 1: PLOR & TEMUAN AWAL ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
            1
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Data Laporan &amp; Temuan Ketidaksesuaian (PLOR)
            </h4>
            <p className="text-[11px] text-gray-500">
              Problem, Location, Objective, Reference beserta akar masalah dan tindakan koreksi awal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Nomor Laporan"
            value={watch("NomorLaporan")}
            disabled={true}
          />
          <TextInput
            label="Tanggal Laporan"
            type="date"
            value={watch("TanggalLaporan")}
            disabled={true}
          />
        </div>

        <RestrictedCkEditor
          label="Ketidaksesuaian (P - Problem)"
          name="KetidaksesuaianP"
          control={control}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Ketidaksesuaian (L - Location)"
          name="KetidaksesuaianL"
          control={control}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Ketidaksesuaian (O - Objective)"
          name="KetidaksesuaianO"
          control={control}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Ketidaksesuaian (R - Reference)"
          name="KetidaksesuaianR"
          control={control}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Akar Masalah"
          name="AkarMasalah"
          control={control}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Tindakan Koreksi Awal"
          name="TindakanKoreksi"
          control={control}
          disabled={true}
        />
      </div>

      {/* ================= BAGIAN 2: RESPON / VERIFIKASI AUDITEE ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
            2
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Respon &amp; Verifikasi Auditee
            </h4>
            <p className="text-[11px] text-gray-500">
              Persetujuan/penolakan dan rencana tindakan perbaikan oleh auditee
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Status Tanggapan Auditee
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`rounded-xl border p-3 transition flex items-center gap-3 ${
                watch("Status") === "1"
                  ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-400 font-bold"
                  : "border-gray-200 bg-gray-50/60 opacity-60"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  watch("Status") === "1" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-400"
                }`}
              >
                {watch("Status") === "1" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-bold text-xs text-gray-800">Diterima</p>
                <p className="text-[11px] text-gray-500">Setuju dengan temuan auditor</p>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 transition flex items-center gap-3 ${
                watch("Status") === "0"
                  ? "border-rose-500 bg-rose-50/80 ring-1 ring-rose-400 font-bold"
                  : "border-gray-200 bg-gray-50/60 opacity-60"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  watch("Status") === "0" ? "border-rose-500 bg-rose-500 text-white" : "border-gray-400"
                }`}
              >
                {watch("Status") === "0" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-bold text-xs text-gray-800">Ditolak</p>
                <p className="text-[11px] text-gray-500">Tidak setuju dengan temuan auditor</p>
              </div>
            </div>
          </div>
        </div>

        {watch("Status") === "0" && (
          <RestrictedCkEditor
            label="Keterangan Tolak Auditee"
            name="KeteranganTolak"
            control={control}
            disabled={true}
          />
        )}

        <RestrictedCkEditor
          label="Tindakan Perbaikan Auditee"
          name="TindakanPerbaikan"
          control={control}
          disabled={true}
        />
      </div>

      {/* ================= BAGIAN 3: TARGET PENYELESAIAN ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
            3
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Jadwal &amp; Target Waktu Penyelesaian
            </h4>
            <p className="text-[11px] text-gray-500">
              Batas waktu penyelesaian yang disepakati bersama
            </p>
          </div>
        </div>

        <TextInput
          label="Tanggal Target Penyelesaian"
          type="date"
          value={watch("TanggalPenyelesaian")}
          disabled={true}
        />
      </div>

      {/* ================= BAGIAN 4: TINJAUAN AUDITOR ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs shrink-0">
            4
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Tinjauan Tindakan Perbaikan (Auditor)
            </h4>
            <p className="text-[11px] text-gray-500">
              Evaluasi efektivitas dan tanggal closing tindakan perbaikan
            </p>
          </div>
        </div>

        <TextInput
          label="Tanggal Closing Auditor"
          type="date"
          value={watch("TanggalClosing")}
          disabled={true}
        />

        <RestrictedCkEditor
          label="Tinjauan Tindakan Perbaikan"
          name="TinjauanTindakanPerbaikan"
          control={control}
          disabled={true}
        />
      </div>

      {/* ================= BAGIAN 5: CLOSING FINAL & PENGESAHAN ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
            5
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Closing Final &amp; Pengesahan Mutu
            </h4>
            <p className="text-[11px] text-gray-500">
              Pengesahan penutupan KTS oleh Auditor dan WMM / UPMF / UPMPS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Tanggal Closing Final"
            type="date"
            value={watch("TanggalClosingFinal")}
            disabled={true}
          />

          <TextInput
            label="WMM / UPMF / UPMPS"
            value={watch("WmmUpmfUpmps")}
            disabled={true}
          />
        </div>
      </div>

      {/* BANNER STATUS KTS */}
      <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-800 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            {readOnly
              ? "Mode Riwayat Audit KTS: Seluruh 5 Bagian Input Ditampilkan Secara Lengkap (Hanya Lihat)."
              : "KTS Selesai (Tutup KTS): Seluruh 5 Bagian Input Ditampilkan Secara Lengkap."}
          </span>
        </div>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="self-start sm:self-center text-xs font-bold text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Dokumen KTS (PDF)</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function KtsForm1({ data, readOnly = false }) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      NomorLaporan: "",
      TanggalLaporan: "",
      KetidaksesuaianP: "",
      KetidaksesuaianL: "",
      KetidaksesuaianO: "",
      KetidaksesuaianR: "",
      AkarMasalah: "",
      TindakanKoreksi: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // populate form saat klik Edit
  useEffect(() => {
    if (!data?.UUID) return;

    reset(
      {
        NomorLaporan: data.NomorLaporan ?? "",
        TanggalLaporan: data.TanggalLaporan ?? "",
        KetidaksesuaianP: data.KetidaksesuaianP ?? "",
        KetidaksesuaianL: data.KetidaksesuaianL ?? "",
        KetidaksesuaianO: data.KetidaksesuaianO ?? "",
        KetidaksesuaianR: data.KetidaksesuaianR ?? "",
        AkarMasalah: data.AkarMasalah ?? "",
        TindakanKoreksi: data.TindakanKoreksi ?? "",
      },
      {
        keepErrors: false,
        keepDirty: false,
      },
    );
  }, [data?.UUID]); // ⬅️ PENTING

  const onSubmit = (data) => {
    if (readOnly) return;
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Nomor Laporan"
        required={!readOnly}
        disabled={readOnly}
        error={errors.NomorLaporan}
        {...(!readOnly ? register("NomorLaporan", {
          required: "Nomor laporan wajib diisi",
        }) : {})}
      />

      <TextInput
        label="Tanggal Laporan"
        type="date"
        required={!readOnly}
        disabled={readOnly}
        error={errors.TanggalLaporan}
        {...(!readOnly ? register("TanggalLaporan", {
          required: "Tanggal laporan wajib diisi",
        }) : {})}
      />

      {/* ================= CKEDITOR FIELDS ================= */}

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Ketidaksesuaian (P)"
        name="KetidaksesuaianP"
        control={control}
        error={errors.KetidaksesuaianP}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Ketidaksesuaian (L)"
        name="KetidaksesuaianL"
        control={control}
        error={errors.KetidaksesuaianL}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Ketidaksesuaian (O)"
        name="KetidaksesuaianO"
        control={control}
        error={errors.KetidaksesuaianO}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Ketidaksesuaian (R)"
        name="KetidaksesuaianR"
        control={control}
        error={errors.KetidaksesuaianR}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Akar Masalah"
        name="AkarMasalah"
        control={control}
        error={errors.AkarMasalah}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Tindakan Koreksi"
        name="TindakanKoreksi"
        control={control}
        error={errors.TindakanKoreksi}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        {readOnly ? (
          <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium text-center">
            Mode Riwayat Audit (Hanya Lihat - Form Dinonaktifkan)
          </div>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        )}
      </div>
    </form>
  );
}

export function KtsForm2({ data, isUbahTindakan = false, readOnly = false }) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      KeteranganTolak: "",
      TindakanPerbaikan: "",
      Status: null,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // populate form saat klik Edit
  useEffect(() => {
    if (!data?.UUID) return;

    reset(
      {
        KeteranganTolak: data.KeteranganTolak,
        TindakanPerbaikan: data.TindakanPerbaikan,
        Status: `${data.StatusAccAuditee}`,
      },
      {
        keepErrors: false,
        keepDirty: false,
      },
    );
  }, [data?.UUID]);

  const onSubmit = (data) => {
    if (readOnly) return;
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      {!isUbahTindakan && (
        <Choice
          name="Status"
          label="Status"
          required={!readOnly}
          disabled={readOnly || isUbahTindakan}
          register={register}
          watchValue={watch("Status")}
          error={errors.Status}
          yesLabel={"Terima"}
          noLabel={"Tolak"}
          yesDesc={"setuju dengan temuan auditor"}
          noDesc={"tidak setuju dengan temuan auditor"}
        />
      )}

      {isUbahTindakan ? (
        <RestrictedCkEditor
          required={!readOnly}
          disabled={readOnly}
          label="Tindakan Koreksi"
          name="TindakanKoreksi"
          control={control}
          error={errors.TindakanKoreksi}
        />
      ) : watch("Status") == "0" ? (
        <>
          <RestrictedCkEditor
            required={!readOnly}
            disabled={readOnly || isUbahTindakan}
            label="Keterangan Tolak"
            name="KeteranganTolak"
            control={control}
            error={errors.KeteranganTolak}
          />
          <RestrictedCkEditor
            required={!readOnly}
            disabled={readOnly}
            label="Tindakan Koreksi"
            name="TindakanKoreksi"
            control={control}
            error={errors.TindakanKoreksi}
          />
        </>
      ) : null}

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        {readOnly ? (
          <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium text-center">
            Mode Riwayat Audit (Hanya Lihat - Form Dinonaktifkan)
          </div>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        )}
      </div>
    </form>
  );
}

export function KtsForm3({ data, readOnly = false }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      TanggalPenyelesaian: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // populate form saat klik Edit
  useEffect(() => {
    if (!data?.UUID) return;

    reset(
      {
        TanggalPenyelesaian: data.TanggalPenyelesaian,
      },
      {
        keepErrors: false,
        keepDirty: false,
      },
    );
  }, [data?.UUID]);

  const onSubmit = (data) => {
    if (readOnly) return;
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Penyelesaian"
        type="date"
        required={!readOnly}
        disabled={readOnly}
        error={errors.TanggalPenyelesaian}
        {...(!readOnly ? register("TanggalPenyelesaian", {
          required: "Tanggal Penyelesaian wajib diisi",
        }) : {})}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        {readOnly ? (
          <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium text-center">
            Mode Riwayat Audit (Hanya Lihat - Form Dinonaktifkan)
          </div>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        )}
      </div>
    </form>
  );
}

export function KtsForm4({ data, readOnly = false }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      TinjauanTindakanPerbaikan: "",
      TanggalClosing: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // populate form saat klik Edit
  useEffect(() => {
    if (!data?.UUID) return;

    reset(
      {
        TinjauanTindakanPerbaikan: data.TinjauanTindakanPerbaikan,
        TanggalClosing: data.TanggalClosing,
      },
      {
        keepErrors: false,
        keepDirty: false,
      },
    );
  }, [data?.UUID]);

  const onSubmit = (data) => {
    if (readOnly) return;
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Closing"
        type="date"
        required={!readOnly}
        disabled={readOnly}
        error={errors.TanggalClosing}
        {...(!readOnly ? register("TanggalClosing", {
          required: "Tanggal Closing wajib diisi",
        }) : {})}
      />

      <RestrictedCkEditor
        required={!readOnly}
        disabled={readOnly}
        label="Tinjauan Tindakan Perbaikan"
        name="TinjauanTindakanPerbaikan"
        control={control}
        error={errors.TinjauanTindakanPerbaikan}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        {readOnly ? (
          <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium text-center">
            Mode Riwayat Audit (Hanya Lihat - Form Dinonaktifkan)
          </div>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        )}
      </div>
    </form>
  );
}

export function KtsForm5({ data, readOnly = false }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      TanggalClosingFinal: "",
      WmmUpmfUpmps: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // populate form saat klik Edit
  useEffect(() => {
    if (!data?.UUID) return;

    reset(
      {
        TanggalClosingFinal: data.TanggalClosingFinal,
        WmmUpmfUpmps: data.WmmUpmfUpmps,
      },
      {
        keepErrors: false,
        keepDirty: false,
      },
    );
  }, [data?.UUID]);

  const onSubmit = (data) => {
    if (readOnly) return;
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Closing"
        type="date"
        required={!readOnly}
        disabled={readOnly}
        error={errors.TanggalClosingFinal}
        {...(!readOnly ? register("TanggalClosingFinal", {
          required: "Tanggal Closing wajib diisi",
        }) : {})}
      />

      <TextInput
        label="Wmm / Upmf / Upmps"
        type="date"
        required={!readOnly}
        disabled={readOnly}
        error={errors.WmmUpmfUpmps}
        {...(!readOnly ? register("WmmUpmfUpmps", {
          required: "Wmm / Upmf / Upmps wajib diisi",
        }) : {})}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        {readOnly ? (
          <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium text-center">
            Mode Riwayat Audit (Hanya Lihat - Form Dinonaktifkan)
          </div>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        )}
      </div>
    </form>
  );
}
