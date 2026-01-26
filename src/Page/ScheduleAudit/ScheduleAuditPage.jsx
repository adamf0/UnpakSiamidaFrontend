import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { BsPlus } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";

const ScheduleAuditPage = () => {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const {getValidToken} = useAuth()

  const deleteData = async () => {
    if(isEmpty(getValidToken)) return;

    const res = await fetch(`http://localhost:3000/renstra/${selectedRow.UUID}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getValidToken()}`
      }
    });
    const data = await res.json();
    console.log(data)
    
    if (res.ok){
      addToast("success", "Data berhasil dihapus");
    } else{
      addToast("error", data?.message || "Data tidak ditemukan");
    }

    setConfirmDelete(false);
    tableRef.current?.reload?.({ resetPage: true });
  }

  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

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
        <h2 className="text-lg font-semibold mb-4">Schedule Audit</h2>

        <div className="border rounded">
          <RemoteTable
            ref={tableRef}
            endpoint="http://localhost:3000/renstras"
            mode="sse"
            token={getValidToken()}
            adapter={ScheduleAuditAdapter}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              <button 
                className="px-3 py-2 bg-purple-600 text-white rounded-lg" 
                onClick={()=>navigate("/schedule_audit/new")}>
                <BsPlus/>
              </button>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true},
              { key: "FakultasUnit", label: "Target Audit", searchable: true},
              { key: "Type", label: "Tipe", searchable: true},
              { key: "Jenjang", label: "Jenjang", searchable: true},
              { key: "Auditee", label: "Auditee", searchable: true},
              { key: "Auditor1", label: "Auditor1", searchable: true},
              { key: "Auditor2", label: "Auditor2", searchable: true},
              { key: "KodeAkses", label: "Kode Akses", searchable: false},
              { key: "PeriodeUploadDokumenMulai", label: "Status Jadwal", className: "w-64", renderKey: (row) => {
                let styleBadge = "bg-gray-500";

                if (row.StatusJadwal === "jadwal bentrok") {
                  styleBadge = "bg-orange-500";
                } else if (row.StatusJadwal === "upload dokumen") {
                  styleBadge = "bg-green-500";
                } else if (row.StatusJadwal === "assesment dokumen") {
                  styleBadge = "bg-blue-500";
                } else if (row.StatusJadwal === "assesment lapangan") {
                  styleBadge = "bg-purple-500";
                } else if (row.StatusJadwal === "audit telah berakhir") {
                  styleBadge = "bg-red-500";
                }

                return (
                  <span
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
                    console.log("kode akses", row);
                    
                    close();
                  }}
                >
                  Atur Kode Akses
                </button>

                <button
                  className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    console.log("kirim email", row);
                    
                    close();
                  }}
                >
                  Kirim Email
                </button>

                <button
                  className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    console.log("ganti jadwal", row);
                    // openEdit(row);
                    close();
                  }}
                >
                  Detail
                </button>

                <button
                  className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    console.log("edit", row);
                    navigate(`/schedule_audit/edit/${row.UUID}`)
                    close();
                  }}
                >
                  Edit
                </button>

                <button
                  className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={() => {
                    console.log("hapus", row);
                    setSelectedRow(row);
                    setConfirmDelete(true);
                    close();
                  }}
                >
                  Hapus
                </button>
              </>
            )}
          />

        </div>

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => deleteData()}
        />

      </div>
    </>
  );
};

export default ScheduleAuditPage;

export const ScheduleAuditAdapter = (rows = []) => {
  const now = new Date();

  const inRange = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    return now >= new Date(startStr) && now <= new Date(endStr);
  };

  const outRange = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
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
