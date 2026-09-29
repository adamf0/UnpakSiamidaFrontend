import React from "react";
import TextInput from "@/Components/TextInput";
import { Sparkles, X } from "lucide-react";

const AutoFillModalFill = ({ modalFill, closeModalFill, watch, applyToGroup }) => {
  if (!modalFill.openFill) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[440px] border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Isi Otomatis Kelompok
              </h3>
              <p className="text-xs text-gray-500 capitalize">
                {modalFill.activeKeyFill?.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={closeModalFill}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-lg text-xs text-purple-800">
            Nilai yang Anda masukkan akan langsung diterapkan ke seluruh target di kelompok ini.
          </div>

          <TextInput
            label="Satuan"
            placeholder="Contoh: Dokumen, Kegiatan, %, dll."
            onChange={(e) => applyToGroup("satuan", e.target.value)}
          />

          {watch(`indikator_renstra`)?.TipeTarget === "range" ? (
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                type="number"
                min="0"
                step="0.0001"
                label="Target Min"
                onChange={(e) => applyToGroup("target_min", e.target.value)}
              />
              <TextInput
                type="number"
                min="0"
                step="0.0001"
                label="Target Max"
                onChange={(e) => applyToGroup("target_max", e.target.value)}
              />
            </div>
          ) : watch(`indikator_renstra`)?.TipeTarget === "numerik" ? (
            <TextInput
              label="Target"
              type="number"
              min="0"
              placeholder="0"
              onChange={(e) => applyToGroup("target", e.target.value)}
            />
          ) : (
            <TextInput
              label="Target"
              placeholder="Target yang diinginkan"
              onChange={(e) => applyToGroup("target", e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klasifikasi</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
              onChange={(e) => applyToGroup("klasifikasi", e.target.value)}
            >
              <option value="">Pilih Klasifikasi</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pembagian Tugas</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
              onChange={(e) => applyToGroup("pembagian_tugas", e.target.value)}
            >
              <option value="">Pilih Pembagian Tugas</option>
              <option value="auditor1">Auditor 1</option>
              <option value="auditor2">Auditor 2</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 bg-gray-50/60 border-t border-gray-100">
          <button
            onClick={closeModalFill}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm font-medium text-white rounded-lg transition shadow-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoFillModalFill;
