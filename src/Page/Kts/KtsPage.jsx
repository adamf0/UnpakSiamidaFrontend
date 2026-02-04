import React, { act, useEffect, useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { cn, isNumeric } from "@/Common/Utils";
import ErrorImg from "@/assets/data-breach.png";
import { useParams } from "react-router-dom";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useForm } from "react-hook-form";
import RestrictedCkEditor from "@/Components/RestrictedCkEditor";
import TextInput from "@/Components/TextInput";
import Choice from "@/Components/Choice";
import InfoAuditCard from "@/Components/InfoAuditCard";

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
    draf: "bg-gray-400 text-gray-800",
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
const KtsPage = () => {
  const { tahun, target, uuidaudit } = useParams();
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

  const [data, setData] = useState([]);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  // selected row (detail kiri)
  const [selectedRow, setSelectedRow] = useState(null);
  const [positionStatus, setPositionStatus] = useState(null);
  const [isUbahTindakan, setIsUbahTindakan] = useState(false);

  // popper action
  const [activeActionId, setActiveActionId] = useState(null);

  useEffect(() => {
    console.log(data);
  }, [data]);

  const fetchData = async () => {
    setLoading(true);

    const token = getValidToken();
    const errors = [];

    try {
      const infoPromise = (async () => {
        try {
          const res = await fetch(
            `http://localhost:3000/renstra/${uuidaudit}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const json = await res.json();
          setInfo(json);
        } catch (err) {
          errors.push({
            url: `http://localhost:3000/Kts/${uuidAudit}`,
            message: err.message || "Gagal memuat info KTS",
            time: new Date().toISOString(),
            raw: err,
          });
        }
      })();

      const ssePromise = (async () => {
        try {
          const res = await fetch(
            `http://localhost:3000/Ktss?mode=sse&filters=targetuuid:eq:${target};tahun:eq:${tahun};`,
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
    const statusMap = {
      draf: KtsForm1,
      menunggu_verif_auditee: KtsForm2,
      terima_auditee: KtsForm3,
      menunggu_penyelesaian: KtsForm4,
      tindakan_penyelesaian: KtsForm5,
      tutup_kts: null,
      tolak_auditee: null,
    };
    const isAvailableEdit = [
      "menunggu_penyelesaian",
      "tindakan_penyelesaian",
      "tutup_kts",
      "tolak_auditee",
      "terima_auditee",
    ].includes(selectedRow?.Status);

    const Component = statusMap[selectedRow?.Status];
    if (!Component) return null;

    if (isAvailableEdit && isUbahTindakan) {
      return <KtsForm2 data={selectedRow} isUbahTindakan={isUbahTindakan} />;
    }

    return <Component data={selectedRow} />;
  }

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

      <div className="p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">KTS Audit</h2>

        {loading && <div className="text-gray-500">Loading...</div>}

        {/* ================= GRID UTAMA ================= */}
        <div
          className="
            grid gap-4
            grid-cols-1
            sm:grid-cols-[1fr_360px]
            h-[calc(100vh-140px)]
          "
        >
          <div className="flex flex-col gap-4 h-full">
            {/* ================= CARD 1 ================= */}
            <div className="border rounded-lg p-4 flex flex-col overflow-hidden">
              {/* Mobile */}
              <div className="sm:hidden flex gap-4 overflow-x-auto">
                <InfoAuditCard info={info} />
              </div>

              {/* Desktop */}
              <div className="hidden sm:block flex-1 overflow-y-auto">
                <InfoAuditCard info={info} />
              </div>
            </div>

            {/* ================= CARD 2 ================= */}
            <div className={`border rounded-lg p-4 overflow-hidden flex flex-col ${!selectedRow? "justify-center items-center":""}`}>
              {/* Mobile */}
              <div className="sm:hidden flex gap-4 overflow-x-auto">
                {selectedRow ? (
                  <div className="min-w-full">{renderContent()}</div>
                ) : (
                  <div className="text-gray-400 text-sm">Pilih data KTS</div>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block flex-1 overflow-y-auto">
                {!selectedRow ? (
                  <div className="text-gray-400 text-sm">
                    {(
                      data?.filter(
                        (d) =>
                          d.Status === "tutup_kts" ||
                          d.Status === "tolak_auditee",
                      ) ?? []
                    ).length > 0
                      ? "KTS selesai diisi semua"
                      : "Pilih data KTS untuk melihat detail"}
                  </div>
                ) : (
                  renderContent()
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {data.length > 0 ? (
              data.map((row) => (
                <CardKts
                  key={row.UUID}
                  row={row}
                  tahun={positionYear}
                  level={level}
                  activeActionId={activeActionId}
                  setActiveActionId={setActiveActionId}
                  onEdit={(row) => setSelectedRow(row)}
                  onChangePosition={(status, ubahTindakan) => {
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
  activeActionId,
  setActiveActionId,
  onEdit,
  onChangePosition,
  isActive = false,
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
      className={`border ${isActive ? "border-green-500" : ""} rounded-lg p-4 shadow-sm hover:shadow-md transition`}
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
                  <ActionItem
                    label={action}
                    danger={action == "Closing"}
                    onClick={() => {
                      setActiveActionId(null);
                      onEdit(row);
                      onChangePosition(null, false);
                    }}
                  />
                  {visibleUbahTindakan && "auditee" == level && (
                    <ActionItem
                      label="Ubah Tindakan"
                      onClick={() => {
                        setActiveActionId(null);
                        onChangePosition("menunggu_verif_auditee", true);
                        onEdit(row);
                      }}
                    />
                  )}

                  {/* <Divider />
                  <ActionItem label="Ubah Tindakan" />
                  <ActionItem label="Penyelesaian" /> */}
                  {/* <Divider />
                  <ActionItem label="Closing" danger />
                  <ActionItem label="Diketahui" /> */}
                  <Divider />
                  <ActionItem label="Download" />
                </div>
              )}
            </div>
          </div>

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

function Divider() {
  return <div className="my-1 border-t" />;
}

export function KtsForm1({ data }) {
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
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Nomor Laporan"
        required
        error={errors.NomorLaporan}
        {...register("NomorLaporan", {
          required: "Nomor laporan wajib diisi",
        })}
      />

      <TextInput
        label="Tanggal Laporan"
        type="date"
        required
        error={errors.TanggalLaporan}
        {...register("TanggalLaporan", {
          required: "Tanggal laporan wajib diisi",
        })}
      />

      {/* ================= CKEDITOR FIELDS ================= */}

      <RestrictedCkEditor
        required
        label="Ketidaksesuaian (P)"
        name="KetidaksesuaianP"
        control={control}
        error={errors.KetidaksesuaianP}
      />

      <RestrictedCkEditor
        required
        label="Ketidaksesuaian (L)"
        name="KetidaksesuaianL"
        control={control}
        error={errors.KetidaksesuaianL}
      />

      <RestrictedCkEditor
        required
        label="Ketidaksesuaian (O)"
        name="KetidaksesuaianO"
        control={control}
        error={errors.KetidaksesuaianO}
      />

      <RestrictedCkEditor
        required
        label="Ketidaksesuaian (R)"
        name="KetidaksesuaianR"
        control={control}
        error={errors.KetidaksesuaianR}
      />

      <RestrictedCkEditor
        required
        label="Akar Masalah"
        name="AkarMasalah"
        control={control}
        error={errors.AkarMasalah}
      />

      <RestrictedCkEditor
        required
        label="Tindakan Koreksi"
        name="TindakanKoreksi"
        control={control}
        error={errors.TindakanKoreksi}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}

export function KtsForm2({ data, isUbahTindakan = false }) {
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
          required
          disabled={isUbahTindakan}
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
          required
          label="Tindakan Koreksi"
          name="TindakanKoreksi"
          control={control}
          error={errors.TindakanKoreksi}
        />
      ) : watch("Status") == "0" ? (
        <>
          <RestrictedCkEditor
            required
            disabled={isUbahTindakan}
            label="Keterangan Tolak"
            name="KeteranganTolak"
            control={control}
            error={errors.KeteranganTolak}
          />
          <RestrictedCkEditor
            required
            label="Tindakan Koreksi"
            name="TindakanKoreksi"
            control={control}
            error={errors.TindakanKoreksi}
          />
        </>
      ) : null}

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}

export function KtsForm3({ data }) {
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
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Penyelesaian"
        type="date"
        required
        error={errors.TanggalPenyelesaian}
        {...register("TanggalPenyelesaian", {
          required: "Tanggal Penyelesaian wajib diisi",
        })}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}

export function KtsForm4({ data }) {
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
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Closing"
        type="date"
        required
        error={errors.TanggalClosing}
        {...register("TanggalClosing", {
          required: "Tanggal Closing wajib diisi",
        })}
      />

      <RestrictedCkEditor
        required
        label="Tinjauan Tindakan Perbaikan"
        name="TinjauanTindakanPerbaikan"
        control={control}
        error={errors.TinjauanTindakanPerbaikan}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}

export function KtsForm5({ data }) {
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
    //ini tidak bekerja validasinya, jika tidak required maka muncul erorr label red
    console.log("SUBMIT DATA:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ================= BASIC INPUT ================= */}

      <TextInput
        label="Tanggal Closing"
        type="date"
        required
        error={errors.TanggalClosingFinal}
        {...register("TanggalClosingFinal", {
          required: "Tanggal Closing wajib diisi",
        })}
      />

      <TextInput
        label="Wmm / Upmf / Upmps"
        type="date"
        required
        error={errors.WmmUpmfUpmps}
        {...register("WmmUpmfUpmps", {
          required: "Wmm / Upmf / Upmps wajib diisi",
        })}
      />

      {/* ================= ACTION ================= */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}
