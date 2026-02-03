import { cn } from "@/Common/Utils";

export function InfoRow({ label, value, className }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(12cqi,auto)_1fr] gap-2">
      <b>{label}:</b>
      <p className={cn("break-words", className)}>{value}</p>
    </div>
  );
}

export default function InfoAuditCard({ info }) {
  return (
    <div className="p-4 border rounded flex flex-col gap-2 min-w-full">
      <InfoRow label="Tahun Audit" value={info?.Tahun} />

      <InfoRow
        label="Target Audit"
        value={
          <>
            {info?.FakultasUnit}
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
        label={
          <>
            Catatan Akhir <br /> Auditor 1
          </>
        }
        value={info?.catatan1 ?? ""}
      />

      <InfoRow
        label={
          <>
            Catatan Akhir <br /> Auditor 2
          </>
        }
        value={info?.catatan2 ?? ""}
      />
    </div>
  );
}