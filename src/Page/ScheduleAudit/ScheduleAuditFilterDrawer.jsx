import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Filter, X, RotateCcw, Check } from "lucide-react";

export const initialAuditFilters = {
  statusAuditor1Renstra: "",
  statusAuditor1Dokumen: "",
  statusAuditor2Renstra: "",
  statusAuditor2Dokumen: "",
  statusJadwal: "",
  temuanKts: "",
};

export default function ScheduleAuditFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}) {
  const [localFilters, setLocalFilters] = useState(
    filters || initialAuditFilters,
  );

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters || initialAuditFilters);
    }
  }, [isOpen, filters]);

  const handleChange = (field, value) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(initialAuditFilters);
    onReset();
    onClose();
  };

  const activeCount = Object.values(localFilters).filter(Boolean).length;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-semibold">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div>
                        <Dialog.Title className="text-base font-semibold text-gray-900 leading-tight">
                          Filter Schedule Audit
                        </Dialog.Title>
                        <p className="text-xs text-gray-500">
                          {activeCount > 0
                            ? `${activeCount} filter aktif`
                            : "Sesuaikan kriteria filter data"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      aria-label="Tutup Filter"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Form */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* 1. Status Auditor 1 terhadap Renstra */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Auditor 1 terhadap Renstra
                      </label>
                      <select
                        value={localFilters.statusAuditor1Renstra}
                        onChange={(e) =>
                          handleChange("statusAuditor1Renstra", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Status</option>
                        <option value="Belum Ditugaskan">Belum Ditugaskan</option>
                        <option value="Belum Menilai">Belum Menilai</option>
                        <option value="Sedang Menilai">Sedang Menilai</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    {/* 2. Status Auditor 1 terhadap Dokumen Tambahan */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Auditor 1 terhadap Dokumen Tambahan
                      </label>
                      <select
                        value={localFilters.statusAuditor1Dokumen}
                        onChange={(e) =>
                          handleChange("statusAuditor1Dokumen", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Status</option>
                        <option value="Belum Ditugaskan">Belum Ditugaskan</option>
                        <option value="Belum Menilai">Belum Menilai</option>
                        <option value="Sedang Menilai">Sedang Menilai</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    {/* 3. Status Auditor 2 terhadap Renstra */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Auditor 2 terhadap Renstra
                      </label>
                      <select
                        value={localFilters.statusAuditor2Renstra}
                        onChange={(e) =>
                          handleChange("statusAuditor2Renstra", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Status</option>
                        <option value="Belum Ditugaskan">Belum Ditugaskan</option>
                        <option value="Belum Menilai">Belum Menilai</option>
                        <option value="Sedang Menilai">Sedang Menilai</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    {/* 4. Status Auditor 2 Dokumen Tambahan */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Auditor 2 Dokumen Tambahan
                      </label>
                      <select
                        value={localFilters.statusAuditor2Dokumen}
                        onChange={(e) =>
                          handleChange("statusAuditor2Dokumen", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Status</option>
                        <option value="Belum Ditugaskan">Belum Ditugaskan</option>
                        <option value="Belum Menilai">Belum Menilai</option>
                        <option value="Sedang Menilai">Sedang Menilai</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    {/* 5. Status Jadwal */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Jadwal
                      </label>
                      <select
                        value={localFilters.statusJadwal}
                        onChange={(e) =>
                          handleChange("statusJadwal", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Status Jadwal</option>
                        <option value="belum mulai audit">
                          Belum Mulai Audit
                        </option>
                        <option value="upload dokumen">Upload Dokumen</option>
                        <option value="assesment dokumen">
                          Assesment Dokumen
                        </option>
                        <option value="assesment lapangan">
                          Assesment Lapangan
                        </option>
                        <option value="audit telah berakhir">
                          Audit Telah Berakhir
                        </option>
                        <option value="jadwal bentrok">Jadwal Bentrok</option>
                      </select>
                    </div>

                    {/* 6. Temuan KTS */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Temuan KTS
                      </label>
                      <select
                        value={localFilters.temuanKts}
                        onChange={(e) =>
                          handleChange("temuanKts", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                      >
                        <option value="">Semua Temuan KTS</option>
                        <optgroup label="Kategori Temuan">
                          <option value="belum_lengkap">Belum Lengkap</option>
                          <option value="lengkap">Lengkap</option>
                          <option value="belum_buat">Belum Buat</option>
                        </optgroup>
                        <optgroup label="Status KTS">
                          <option value="draf">Draf</option>
                          <option value="menunggu_verif">Menunggu Verifikasi Auditee</option>
                          <option value="terima_auditee">Terima Auditee</option>
                          <option value="tolak_auditee">Tolak Auditee</option>
                          <option value="menunggu_penyelesaian">Tunggu Penyelesaian</option>
                          <option value="tindakan_penyelesaian">Tindakan Penyelesaian</option>
                          <option value="tutup_kts">Tutup KTS</option>
                          <option value="status_lainnya">Status Lainnya (Proses / Selesai)</option>
                        </optgroup>
                      </select>
                      <div className="mt-1.5 text-[11px] text-gray-500 space-y-0.5">
                        <p>
                          • <strong>Belum Lengkap:</strong> KTS baru dibuat sebagian atau masih ada draf.
                        </p>
                        <p>
                          • <strong>Lengkap:</strong> Semua temuan sudah dibuatkan KTS.
                        </p>
                        <p>
                          • <strong>Belum Buat:</strong> Ada temuan tapi KTS belum dibuat sama sekali.
                        </p>
                        <p>
                          • <strong>Status KTS:</strong> Filter data yang memiliki temuan KTS pada status tertentu.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-500" />
                      Reset Filter
                    </button>

                    <button
                      type="button"
                      onClick={handleApply}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Terapkan Filter
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
