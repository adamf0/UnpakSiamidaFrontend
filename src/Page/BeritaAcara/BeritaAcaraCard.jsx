import React from "react";
import { MoreVertical, Calendar } from "lucide-react";
import { InfoRow } from "@/Components/InfoAuditCard";
import { formatTanggalIndo } from "@/Common/Utils";

export default function BeritaAcaraCard({
  row,
  onOpenAction,
}) {
  return (
    <div
      className="relative rounded-xl border border-gray-200/90 p-4 hover:shadow-md hover:border-purple-300 transition-all duration-150 bg-white shadow-2xs"
    >
      {/* Header + Action */}
      <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-gray-100">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
          <Calendar className="w-3 h-3 text-purple-600" />
          Periode {row?.Tahun ?? "-"}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();

            const rect = e.currentTarget.getBoundingClientRect();

            onOpenAction({
              row,
              rect,
            });
          }}
          className="p-1 text-gray-400 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition cursor-pointer"
          title="Menu Aksi"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <InfoRow
          label="Tanggal"
          value={formatTanggalIndo(row?.Tanggal)}
        />

        <InfoRow
          label="Auditee"
          value={row?.Auditee ?? "-"}
        />

        <InfoRow
          label="Auditor 1"
          value={row?.Auditor1 ?? "-"}
        />

        <InfoRow
          label="Auditor 2"
          value={row?.Auditor2 ?? "-"}
        />
      </div>
    </div>
  );
}
