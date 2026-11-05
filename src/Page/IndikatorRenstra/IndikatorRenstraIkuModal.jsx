import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import {
  Search,
  X,
  Loader2,
  Check,
  BookmarkCheck,
  CheckSquare,
  RotateCcw,
  Sparkles,
  Layers,
  Calculator,
  ShieldCheck,
  Filter,
} from "lucide-react";

/**
 * Helper untuk merender badge jenis IKU dengan styling visual yang kontras & tegas:
 * - WAJIB: Merah/Rose (Komitmen Utama)
 * - PILIHAN: Kuning/Amber (Opsi Fleksibel)
 * - PARTISIPATIF: Hijau/Teal (Kolaboratif & Inisiatif)
 */
export const renderJenisIkuBadge = (jenis) => {
  const j = String(jenis || "").toUpperCase().trim();
  if (j === "WAJIB") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Wajib
      </span>
    );
  }
  if (j === "PILIHAN") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Pilihan
      </span>
    );
  }
  if (j === "PARTISIPATIF") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
        Partisipatif
      </span>
    );
  }
  if (!j) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
      {jenis}
    </span>
  );
};

export default function IndikatorRenstraIkuModal({
  open,
  indikatorData,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ikuList, setIkuList] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [jenisFilter, setJenisFilter] = useState("ALL"); // 'ALL' | 'WAJIB' | 'PILIHAN' | 'PARTISIPATIF' | 'SELECTED'

  const identifier =
    indikatorData?.Uuid ||
    indikatorData?.UUID ||
    indikatorData?.Id ||
    indikatorData?.id;

  // Load IKU list & existing mappings when modal opens
  useEffect(() => {
    if (!open || !identifier) {
      setSearchQuery("");
      setJenisFilter("ALL");
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resMasterIku, resMapping] = await Promise.all([
          apiClient.get("/master_iku"),
          apiClient.get(`/indikatorrenstra/${identifier}/iku`),
        ]);

        if (!isMounted) return;

        const rawIkus = resMasterIku?.data ?? resMasterIku;
        const rawMapping = resMapping?.data ?? resMapping;

        setIkuList(Array.isArray(rawIkus) ? rawIkus : []);

        const mappedIds = rawMapping?.iku_ids || [];
        setSelectedIds(new Set(mappedIds.map((id) => Number(id))));
      } catch (err) {
        if (!isMounted) return;
        console.error("Gagal memuat data IKU:", err);
        addToast("error", "Gagal memuat daftar IKU: " + (err?.message || "Error"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, identifier]);

  // Hitung jumlah per kategori jenis IKU
  const counts = useMemo(() => {
    let wajib = 0;
    let pilihan = 0;
    let partisipatif = 0;
    for (const item of ikuList) {
      const j = String(item.jenis_iku || "").toUpperCase().trim();
      if (j === "WAJIB") wajib++;
      else if (j === "PILIHAN") pilihan++;
      else if (j === "PARTISIPATIF") partisipatif++;
    }
    return {
      all: ikuList.length,
      wajib,
      pilihan,
      partisipatif,
      selected: selectedIds.size,
    };
  }, [ikuList, selectedIds]);

  // Filtered listview based on search query & jenis tab
  const filteredList = useMemo(() => {
    return ikuList.filter((item) => {
      const numId = Number(item.id);
      const j = String(item.jenis_iku || "").toUpperCase().trim();

      // Filter tab
      if (jenisFilter === "WAJIB" && j !== "WAJIB") return false;
      if (jenisFilter === "PILIHAN" && j !== "PILIHAN") return false;
      if (jenisFilter === "PARTISIPATIF" && j !== "PARTISIPATIF") return false;
      if (jenisFilter === "SELECTED" && !selectedIds.has(numId)) return false;

      // Filter search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (item.iku && String(item.iku).toLowerCase().includes(q)) ||
        (item.kategori && String(item.kategori).toLowerCase().includes(q)) ||
        (item.satuan && String(item.satuan).toLowerCase().includes(q)) ||
        (item.jenis_iku && String(item.jenis_iku).toLowerCase().includes(q))
      );
    });
  }, [ikuList, jenisFilter, searchQuery, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const numId = Number(id);
      if (next.has(numId)) {
        next.delete(numId);
      } else {
        next.add(numId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredList.forEach((item) => next.add(Number(item.id)));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredList.forEach((item) => next.delete(Number(item.id)));
      return next;
    });
  };

  const handleSave = async () => {
    if (!identifier) return;

    try {
      setSaving(true);
      const payload = {
        iku_ids: Array.from(selectedIds),
      };

      await apiClient.post(`/indikatorrenstra/${identifier}/iku`, payload);
      addToast("success", "Pemetaan IKU berhasil disimpan");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan mapping IKU:", err);
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal menyimpan pemetaan IKU"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-150">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-150 flex items-start justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookmarkCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                      Pemetaan IKU Indikator Renstra
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pilih dan hubungkan Indikator Kinerja Utama (IKU) universitas dengan indikator renstra terpilih
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indikator Renstra Info Banner */}
              {indikatorData && (
                <div className="px-5 py-3 bg-purple-50/50 border-b border-purple-150/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-2xs uppercase tracking-wider font-bold text-purple-900 block">
                      Indikator Renstra:
                    </span>
                    <span className="text-gray-900 font-semibold line-clamp-2 mt-0.5">
                      {indikatorData.Indikator || indikatorData.indikator || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-gray-600 text-2xs pt-1 sm:pt-0">
                    {indikatorData.Tahun && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-purple-200 font-semibold text-purple-900">
                        Tahun: {indikatorData.Tahun}
                      </span>
                    )}
                    {indikatorData.Standar && (
                      <span
                        className="px-2 py-0.5 rounded-md bg-white border border-purple-200 font-semibold text-purple-900 max-w-[200px] truncate"
                        title={indikatorData.Standar}
                      >
                        {indikatorData.Standar}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Toolbar: Search, Category Quick-Tabs, & Bulk Actions */}
              <div className="p-4 border-b border-gray-150 bg-white space-y-3">
                {/* Search Bar & Bulk Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari IKU berdasarkan kode, nama kategori, formula, atau satuan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      disabled={loading || filteredList.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl border border-purple-200 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>Pilih Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      disabled={loading || selectedIds.size === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                      <span>Batal Pilih</span>
                    </button>
                  </div>
                </div>

                {/* Quick Filter Tabs for Category Types: SEMUA, WAJIB, PILIHAN, PARTISIPATIF, TERPILIH */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setJenisFilter("ALL")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      jenisFilter === "ALL"
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Semua ({counts.all})
                  </button>

                  <button
                    type="button"
                    onClick={() => setJenisFilter("WAJIB")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      jenisFilter === "WAJIB"
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Wajib ({counts.wajib})
                  </button>

                  <button
                    type="button"
                    onClick={() => setJenisFilter("PILIHAN")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      jenisFilter === "PILIHAN"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pilihan ({counts.pilihan})
                  </button>

                  <button
                    type="button"
                    onClick={() => setJenisFilter("PARTISIPATIF")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      jenisFilter === "PARTISIPATIF"
                        ? "bg-teal-600 text-white shadow-2xs"
                        : "bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    Partisipatif ({counts.partisipatif})
                  </button>

                  <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={() => setJenisFilter("SELECTED")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ml-auto sm:ml-0 ${
                      jenisFilter === "SELECTED"
                        ? "bg-purple-700 text-white shadow-2xs"
                        : "bg-purple-100/70 text-purple-800 border border-purple-200 hover:bg-purple-200/70"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                    <span>Terpilih ({counts.selected})</span>
                  </button>
                </div>
              </div>

              {/* Listview Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[260px] max-h-[460px] bg-gray-50/50">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
                    <span className="text-xs font-medium">Memuat daftar master IKU...</span>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center p-4">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600">
                      Tidak ada data IKU yang cocok dengan filter
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {jenisFilter !== "ALL"
                        ? `Tidak ada IKU pada kategori "${jenisFilter}". Silakan beralih ke tab kategori lain.`
                        : "Coba kata kunci pencarian yang lain."}
                    </p>
                  </div>
                ) : (
                  filteredList.map((item) => {
                    const numId = Number(item.id);
                    const isChecked = selectedIds.has(numId);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelect(numId)}
                        className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-200"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 shadow-2xs"
                        }`}
                      >
                        {/* Custom Modern Checkbox */}
                        <div className="pt-0.5 shrink-0">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-purple-600 text-white shadow-xs"
                                : "border-2 border-gray-300 bg-white hover:border-purple-400"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Badges Row: Code IKU, Satuan, Jenis IKU (Wajib, Pilihan, Partisipatif) */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Badge Kode IKU */}
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 font-mono border border-purple-200/60 shadow-2xs">
                              {item.iku || `IKU ${item.id}`}
                            </span>

                            {/* Badge Satuan */}
                            {item.satuan && (
                              <span className="inline-flex items-center px-2 py-0.5 text-2xs font-semibold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                Satuan: {item.satuan}
                              </span>
                            )}

                            {/* Badge Target jika ada */}
                            {item.target && (
                              <span className="inline-flex items-center px-2 py-0.5 text-2xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                Target: {item.target}
                              </span>
                            )}

                            {/* Badge Kategori Jenis: Wajib, Pilihan, Partisipatif */}
                            {renderJenisIkuBadge(item.jenis_iku)}
                          </div>

                          {/* Nama Kategori IKU (Judul Indikator) */}
                          <p className="text-xs sm:text-sm text-gray-900 font-bold leading-snug">
                            {item.kategori || "-"}
                          </p>

                          {/* Formula Calculation Box (Structured & Clean) */}
                          {item.formula_text && (
                            <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200/70 text-2xs font-mono text-gray-600">
                              <Calculator className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span className="text-gray-400 font-semibold shrink-0">Formula:</span>
                              <span className="line-clamp-2 leading-relaxed text-gray-700">
                                {item.formula_text}
                              </span>
                            </div>
                          )}

                          {/* Sumber Data Info jika ada */}
                          {item.sumber_data && (
                            <div className="text-3xs text-gray-400 flex items-center gap-1 pt-0.5">
                              <span>Sumber Data:</span>
                              <span className="font-medium text-gray-600">{item.sumber_data}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-gray-150 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    {selectedIds.size} dari {ikuList.length} IKU dipilih
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{saving ? "Menyimpan..." : "Simpan Pemetaan IKU"}</span>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
