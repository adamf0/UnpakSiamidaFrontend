import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";

import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { renderLabelFakultasUnit } from "@/Common/Utils";
import { FileSpreadsheet, FileText, Trash2 } from "lucide-react";

const AuditPage = () => {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const [tahun, setTahun] = useState(0);
  const { positionYear, activeYear } = useContent();

  useEffect(()=>{
    if(!positionYear) return;

    if(positionYear){
      setTahun(positionYear);
    }
    console.log(positionYear)
  },[positionYear]);

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();
  const {getValidToken} = useAuth()

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
      <div className="p-3 bg-white">
        <h2 className="text-lg font-semibold mb-4">Audit</h2>

        <div className="border rounded">
          {
            tahun>0 && 
            <RemoteTable
              ref={tableRef}
              endpoint={`/renstra/audit/${tahun}`}
              mode="paging"
              token={getValidToken()}
              adapter={AuditAdapter}
              listcolumns={[
                { key: "Tahun", label: "Tahun", searchable: true },
                { key: "FakultasUnit", label: "Target Audit", searchable: true, renderKey: (row) => renderLabelFakultasUnit(row)},
                { key: "Fakultas", label: "Fakultas", searchable: true },
                { key: "PeriodeUploadDokumenMulai", label: "Status Jadwal", className: "w-64", renderKey: (row) => {
                  let styleBadge = "bg-gray-500 hover:bg-gray-600";

                  if (row.StatusJadwal === "jadwal bentrok") {
                    styleBadge = "bg-orange-500 hover:bg-orange-600";
                  } else if (row.StatusJadwal === "upload dokumen") {
                    styleBadge = "bg-green-500 hover:bg-green-600";
                  } else if (row.StatusJadwal === "assesment dokumen") {
                    styleBadge = "bg-blue-500 hover:bg-blue-600";
                  } else if (row.StatusJadwal === "assesment lapangan") {
                    styleBadge = "bg-purple-500 hover:bg-purple-600";
                  } else if (row.StatusJadwal === "audit telah berakhir") {
                    styleBadge = "bg-red-500 hover:bg-red-600";
                  }

                  return (
                    <span
                      onClick={() => {
                        setJadwalOpen(true);
                        setJadwalRow(row);
                      }}
                      className={`${styleBadge} px-2 py-1 text-xs text-white rounded-full block max-w-[16rem] truncate`}
                    >
                      {row.StatusJadwal}
                    </span>
                  );

                }, searchable: false},
              ]}
              renderAction={({ row, close }) => {
                const hasRenstra = parseInt(row?.TotalRenstra || "0", 10) > 0;
                const hasDokumen = parseInt(row?.TotalDokumen || "0", 10) > 0;

                return (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={!hasRenstra}
                      title={hasRenstra ? "Renstra" : "Data renstra kosong"}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all text-left group ${
                        hasRenstra
                          ? "text-gray-700 hover:text-indigo-700 hover:bg-indigo-50/80 cursor-pointer"
                          : "text-gray-400 opacity-40 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (!hasRenstra) return;
                        navigate(`/audit/renstra/${row.UUID}`);
                        close();
                      }}
                    >
                      <FileSpreadsheet
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          hasRenstra ? "text-indigo-600 group-hover:scale-110" : "text-gray-400"
                        }`}
                      />
                      <span>Renstra</span>
                    </button>

                    <button
                      type="button"
                      disabled={!hasDokumen}
                      title={hasDokumen ? "Dokumen Tambahan" : "Data dokumen tambahan kosong"}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all text-left group ${
                        hasDokumen
                          ? "text-gray-700 hover:text-sky-700 hover:bg-sky-50/80 cursor-pointer"
                          : "text-gray-400 opacity-40 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (!hasDokumen) return;
                        navigate(`/audit/tambahan/${row.UUID}`);
                        close();
                      }}
                    >
                      <FileText
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          hasDokumen ? "text-sky-600 group-hover:scale-110" : "text-gray-400"
                        }`}
                      />
                      <span>Dokumen Tambahan</span>
                    </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50/80 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      navigate(`/kts/${row.Tahun}/${row.FakultasUnitUuid}/${row.UUID}`);
                      close();
                    }}
                  >
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>KTS</span>
                  </button>

                  <div className="my-1 border-t border-gray-150" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      close();
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Hapus</span>
                  </button>
                </div>
              );
            }}
            />
          }
        </div>

      </div>
    </>
  );
};

export default AuditPage;

export const AuditAdapter = (rows = []) => {
  const now = new Date();

  const inRange = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    return now >= new Date(startStr) && now <= new Date(endStr);
  };

  const outRange = (dateStr) => {
    if (!dateStr) return false;
    return new Date() >= new Date(dateStr);
  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    return new Date(aStart) <= new Date(bEnd) &&
           new Date(bStart) <= new Date(aEnd);
  };

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return rows.map((r) => {
    const uploadRange = inRange(
      r.PeriodeUploadMulai,
      r.PeriodeUploadAkhir
    );

    const dokumenRange = inRange(
      r.PeriodeAssesmentDokumenMulai,
      r.PeriodeAssesmentDokumenAkhir
    );

    const lapanganRange = inRange(
      r.PeriodeAssesmentLapanganMulai,
      r.PeriodeAssesmentLapanganAkhir
    );

    const isOutRangeAl = outRange(r.PeriodeAssesmentLapanganAkhir);

    const bentrok =
      overlap(
        r.PeriodeUploadMulai,
        r.PeriodeUploadAkhir,
        r.PeriodeAssesmentDokumenMulai,
        r.PeriodeAssesmentDokumenAkhir
      ) ||
      overlap(
        r.PeriodeUploadMulai,
        r.PeriodeUploadAkhir,
        r.PeriodeAssesmentLapanganMulai,
        r.PeriodeAssesmentLapanganAkhir
      ) ||
      overlap(
        r.PeriodeAssesmentDokumenMulai,
        r.PeriodeAssesmentDokumenAkhir,
        r.PeriodeAssesmentLapanganMulai,
        r.PeriodeAssesmentLapanganAkhir
      );

    let StatusJadwal = "belum mulai audit";

    if (bentrok) {
      StatusJadwal = "jadwal bentrok";
    } else if (uploadRange) {
      StatusJadwal = "upload dokumen";
    } else if (dokumenRange) {
      StatusJadwal = "assesment dokumen";
    } else if (lapanganRange) {
      StatusJadwal = "assesment lapangan";
    } else if(isOutRangeAl){
      StatusJadwal = "audit telah berakhir";
    }

    return {
      ...r,
      StatusJadwal,

      // field tanggal terformat (field baru)
      PeriodeUploadMulaiFmt: formatDate(r.PeriodeUploadMulai),
      PeriodeUploadAkhirFmt: formatDate(r.PeriodeUploadAkhir),

      PeriodeAssesmentDokumenMulaiFmt: formatDate(
        r.PeriodeAssesmentDokumenMulai
      ),
      PeriodeAssesmentDokumenAkhirFmt: formatDate(
        r.PeriodeAssesmentDokumenAkhir
      ),

      PeriodeAssesmentLapanganMulaiFmt: formatDate(
        r.PeriodeAssesmentLapanganMulai
      ),
      PeriodeAssesmentLapanganAkhirFmt: formatDate(
        r.PeriodeAssesmentLapanganAkhir
      ),
    };
  });
};

export function JadwalModal({ open, onClose, row }) {
  if (!open) return null;

  function getRangeStatus(start, end) {
    if (!start || !end) return {
      active: false,
      label: "Belum dijadwalkan",
      color: "bg-gray-400",
    };

    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);

    if (now < s) {
      return { active: false, label: "Belum mulai", color: "bg-yellow-500" };
    }

    if (now > e) {
      return { active: false, label: "Selesai", color: "bg-red-500" };
    }

    return { active: true, label: "Sedang berjalan", color: "bg-green-600" };
  }

  const upload = getRangeStatus(
    row.PeriodeUploadMulai,
    row.PeriodeUploadAkhir
  );

  const dokumen = getRangeStatus(
    row.PeriodeAssesmentDokumenMulai,
    row.PeriodeAssesmentDokumenAkhir
  );

  const lapangan = getRangeStatus(
    row.PeriodeAssesmentLapanganMulai,
    row.PeriodeAssesmentLapanganAkhir
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Jadwal Audit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <JadwalItem
            title="Upload Dokumen"
            start={row.PeriodeUploadMulai}
            end={row.PeriodeUploadAkhir}
            status={upload}
          />

          <JadwalItem
            title="Assesment Dokumen"
            start={row.PeriodeAssesmentDokumenMulai}
            end={row.PeriodeAssesmentDokumenAkhir}
            status={dokumen}
          />

          <JadwalItem
            title="Assesment Lapangan"
            start={row.PeriodeAssesmentLapanganMulai}
            end={row.PeriodeAssesmentLapanganAkhir}
            status={lapangan}
          />
        </div>
      </div>
    </div>
  );
}
function JadwalItem({ title, start, end, status }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium">{title}</span>
        <span
          className={`${status.color} text-white text-xs px-2 py-0.5 rounded-full`}
        >
          {status.label}
        </span>
      </div>

      <div className="text-gray-600 text-xs">
        {start && end
          ? `${start} – ${end}`
          : "Tanggal belum ditentukan"}
      </div>
    </div>
  );
}
