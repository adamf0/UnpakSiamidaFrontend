import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";

import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { renderLabelFakultasUnit } from "@/Common/Utils";

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
              endpoint={`http://localhost:3000/renstra/audit/${tahun}`}
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
              renderAction={({ row, close }) => (
                <>
                  <button
                    className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      console.log("edit", row);
                      navigate(`/audit/renstra/${row.UUID}`);
                      close();
                    }}
                  >
                    Renstra
                  </button>

                  <button
                    className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      console.log("dokumen tambahan", row);
                      navigate(`/audit/tambahan/${row.UUID}`);
                      close();
                    }}
                  >
                    Dokumen Tambahan
                  </button>

                  <button
                    className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      console.log("edit", row);
                      navigate(`/kts/${row.Tahun}/${row.FakultasUnitUuid}/${row.UUID}`);
                      close();
                    }}
                  >
                    KTS
                  </button>

                  <button
                    className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                    onClick={() => {
                      console.log("hapus", row);
                      close();
                    }}
                  >
                    Hapus
                  </button>
                </>
              )}
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
