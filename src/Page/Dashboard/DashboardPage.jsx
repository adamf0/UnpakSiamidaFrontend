import React from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { AlertCircle, Clock } from "lucide-react";

/* =========================
   STATUS LEGEND (SOURCE OF TRUTH)
========================= */
const STATUS_LEGEND = {
  verifikasi: {
    label: "Belum Diverifikasi",
    color: "bg-[#1a82c3]",
  },
  gagal: {
    label: "Gagal Verifikasi",
    color: "bg-[#d9534f]",
  },
  sukses: {
    label: "Terverifikasi",
    color: "bg-[#26b99a]",
  },
  kosong: {
    label: "Belum Ada Dokumen",
    color: "bg-[#777]",
  },
};

/* =========================
   HELPER
========================= */
function getBackground({
  count_verif = 0,
  count_fail_verif = 0,
  count_success_verif = 0,
}) {
  if (count_verif > 0) return STATUS_LEGEND.verifikasi.color;
  if (count_fail_verif > 0) return STATUS_LEGEND.gagal.color;
  if (count_success_verif > 0) return STATUS_LEGEND.sukses.color;
  return STATUS_LEGEND.kosong.color;
}

/* =========================
   PAGE
========================= */
const DashboardPage = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const { level, setLevel, listLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

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

      <main className="p-6 space-y-6">
        {/* ANNOUNCEMENT */}
        <ProkerAnnouncementCard
          status="Ditutup"
          closedAt="25 Januari 2026, 23:59 WIB"
        />

        {/* TABLE CARD */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800">
              Monitoring Dokumen Program Kerja
            </h4>
            <p className="text-sm text-gray-500">
              Status kelengkapan dan verifikasi dokumen per mata program
            </p>
          </div>

          {/* LEGEND */}
          <div className="flex flex-wrap gap-4 px-5 py-4 border-b bg-gray-50">
            {Object.values(STATUS_LEGEND).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <span className={`w-3 h-3 rounded-sm ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto min-w-[900px]">
              <thead className="bg-gray-100 text-sm text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Mata Program</th>
                  <th className="px-4 py-3 w-12">SK</th>
                  <th className="px-4 py-3 w-12">SOP</th>
                  <th className="px-4 py-3 w-12">Proposal/TOR</th>
                  <th className="px-4 py-3 w-12">Laporan</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium">
                    Program Peningkatan Mutu
                  </td>

                  <td
                    className={`px-4 py-3 ${getBackground({
                      count_verif: 1,
                    })}`}
                  />

                  <td
                    className={`px-4 py-3 ${getBackground({
                      count_verif: 1,
                    })}`}
                  />

                  <td
                    className={`px-4 py-3 ${getBackground({
                      count_fail_verif: 1,
                    })}`}
                  />

                  <td
                    className={`px-4 py-3 ${getBackground({
                      count_success_verif: 1,
                    })}`}
                  />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
};

export default DashboardPage;

/* =========================
   ANNOUNCEMENT CARD
========================= */
function ProkerAnnouncementCard({ status = "Info", closedAt }) {
  const statusColor = {
    Ditutup: "bg-red-100 text-red-700 border-red-200",
    Dibuka: "bg-green-100 text-green-700 border-green-200",
    Info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const title = {
    Ditutup: "Pelaporan Program Kerja Telah Ditutup",
    Dibuka: "Pelaporan Program Kerja Telah Dibuka",
    Info: "",
  };

  const desc = {
    Ditutup:
      "Batas waktu pengisian dan pelaporan program kerja telah berakhir. Data yang masuk setelah waktu ini tidak akan diproses.",
    Dibuka:
      "Waktu pengisian dan pelaporan program kerja masih dibuka, ayo isi data prokernya!",
    Info: "",
  };

  return (
    <div className="w-full rounded-2xl border bg-white shadow-sm overflow-hidden transition hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        {/* IMAGE */}
        <div className="md:w-[260px] w-full h-[180px] md:h-auto overflow-hidden">
          <img
            src="https://thumbs.dreamstime.com/b/time-management-manage-project-deadline-improve-work-efficiency-productivity-to-finish-concept-happy-entrepreneur-woman-222260157.jpg?w=992"
            alt="Proker"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>

        {/* CONTENT */}
        <div className="flex flex-col justify-center gap-3 p-5 flex-1">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium w-fit ${
              statusColor[status]
            }`}
          >
            <AlertCircle size={16} />
            {status}
          </span>

          <h5 className="text-lg md:text-xl font-semibold text-gray-900">
            {title[status]}
          </h5>

          <p className="text-sm text-gray-600 leading-relaxed">
            {desc[status]}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>Ditutup: {closedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
