import React from "react";
import { FiMoreVertical } from "react-icons/fi";
import { InfoRow } from "@/Components/InfoAuditCard";
import { formatTanggalIndo } from "@/Common/Utils";

export default function BeritaAcaraCard({
  row,
  onOpenAction,
}) {
  console.log(row)
  return (
    <div
      className="relative border rounded-lg px-3 py-4 hover:shadow-md transition bg-white"
    >
      {/* Header + Action */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-light">
          {row?.Tahun ?? "-"}
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
          className="text-black hover:text-purple-600"
        >
          <FiMoreVertical />
        </button>
      </div>

      {/* Content */}
      <InfoRow
        className="font-light"
        label="Tanggal"
        value={formatTanggalIndo(row?.Tanggal)}
      />

      <InfoRow
        className="font-light"
        label="Auditee"
        value={row?.Auditee ?? "-"}
      />

      <InfoRow
        className="font-light"
        label="Auditor 1"
        value={row?.Auditor1 ?? "-"}
      />

      <InfoRow
        className="font-light"
        label="Auditor 2"
        value={row?.Auditor2 ?? "-"}
      />
    </div>
  );
}
