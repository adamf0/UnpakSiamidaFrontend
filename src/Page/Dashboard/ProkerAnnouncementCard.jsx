import { AlertCircle, Clock } from "lucide-react";

export default function ProkerAnnouncementCard({ status = "Info", closedAt }) {
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