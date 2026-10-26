import { cn, renderLabelFakultasUnit } from "@/Common/Utils";

export function InfoRow({ label, value, className }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[165px_1fr] gap-1 md:gap-2 items-baseline text-xs sm:text-sm">
      <span className="font-semibold text-gray-700">{label}:</span>
      <div className={cn("text-gray-900 break-words", className)}>{value || "-"}</div>
    </div>
  );
}

export default function InfoAuditCard({ info }) {
  return (
    <div className="p-3 sm:p-3.5 border border-gray-200 rounded-xl flex flex-col gap-1.5 min-w-full bg-white shadow-2xs">
      <InfoRow label="Tahun Audit" value={info?.Tahun} />

      <InfoRow
        label="Target Audit"
        value={
          <>
            {renderLabelFakultasUnit(info)}
            {info?.Type === "unit"
              ? " (Unit)"
              : info?.Fakultas === "fakultas"
                ? " (Fakultas)"
                : ` (prodi#${info?.Jenjang ?? "-"}#${info?.Fakultas ?? "-"})`}
          </>
        }
      />

      <InfoRow label="Auditee" value={info?.Auditee} />
      <InfoRow label="Auditor 1" value={info?.Auditor1} />
      <InfoRow label="Auditor 2" value={info?.Auditor2} />

      <InfoRow
        label="Catatan Akhir Auditor 1"
        value={info?.catatan1}
      />

      <InfoRow
        label="Catatan Akhir Auditor 2"
        value={info?.catatan2}
      />
    </div>
  );
}