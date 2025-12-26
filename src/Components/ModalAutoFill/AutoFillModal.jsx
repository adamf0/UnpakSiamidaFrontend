import React from "react";
import TextInput from "@/Components/TextInput";

const AutoFillModalFill = ({ modalFill, closeModalFill, watch, applyToGroup }) => {
  if (!modalFill.openFill) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-[420px] space-y-3">
        <h3 className="font-bold text-center">
          Form Auto Fill <br /> {modalFill.activeKeyFill.replaceAll("_", " ")}
        </h3>

        <TextInput
          label="Satuan"
          onChange={(e) => applyToGroup("satuan", e.target.value)}
        />

        {watch(`indikator_renstra`).TipeTarget === "range" ? (
          <div className="flex gap-2">
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
        ) : watch(`indikator_renstra`).TipeTarget === "numerik" ? (
          <TextInput
            label="Target"
            type="number"
            min="0"
            onChange={(e) => applyToGroup("target", e.target.value)}
          />
        ) : (
          <TextInput
            label="Target"
            onChange={(e) => applyToGroup("target", e.target.value)}
          />
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Klasifikasi </label>
          <select
            className="w-full px-3 py-2 text-sm rounded border outline-none transition"
            onChange={(e) => applyToGroup("klasifikasi", e.target.value)}
          >
            <option value=""></option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pembagian Tugas</label>
          <select
            className="w-full px-3 py-2 text-sm rounded border outline-none transition"
            onChange={(e) => applyToGroup("pembagian_tugas", e.target.value)}
          >
            <option value=""></option>
            <option value="auditor1">Auditor1</option>
            <option value="auditor2">Auditor2</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={closeModalFill}
            className="px-3 py-1 bg-purple-500 text-sm hover:bg-purple-400 rounded text-white"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoFillModalFill;
