import { useState } from "react";
import ErrorImg from "@/assets/data-breach.png";

export default function ErrorSection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    peran: "",
    pesan: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const err = {};

    if (!form.nama.trim()) {
      err.nama = "Nama wajib diisi";
    }

    if (!form.peran.trim()) {
      err.peran = "Peran wajib diisi";
    }

    if (!form.pesan.trim()) {
      err.pesan = "Keterangan masalah wajib diisi";
    } else if (form.pesan.length < 10) {
      err.pesan = "Minimal 10 karakter";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    console.log("Report dikirim:", form);
    //[pr] kirim ke API send email

    setOpen(false);
    setForm({ nama: "", peran: "", pesan: "" });
    setErrors({});
  };

  const onChange = (key, value) => {
    setForm({ ...form, [key]: value });
    setErrors({ ...errors, [key]: undefined }); // clear error realtime
  };

  return (
    <div className="p-4 bg-white w-full h-screen">
      <h2 className="text-lg font-semibold mb-4">Tambah Template Renstra</h2>

      <div className="w-full">
        <div className="h-screen flex items-center justify-center p-6 border rounded-lg bg-white shadow-sm">
          <div className="flex flex-col items-center text-center gap-3">
            <img src={ErrorImg} alt="error" className="w-32" />

            <h2 className="text-base font-semibold text-gray-800">
              Ada masalah pada aplikasi
            </h2>

            <p className="text-sm text-gray-500">
              Data tidak dapat ditampilkan saat ini.
              Jika masalah berlanjut, hubungi administrator.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-500"
              >
                Coba Lagi
              </button>

              <button
                onClick={() => setOpen(true)}
                className="px-4 py-2 border border-purple-600 text-purple-600 text-sm rounded hover:bg-purple-50"
              >
                Kirim Report Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Kirim Report ke Admin
            </h3>

            <div className="space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm mb-1">Atas Nama</label>
                <input
                  value={form.nama}
                  onChange={(e) => onChange("nama", e.target.value)}
                  className={`w-full px-3 py-2 border rounded ${
                    errors.nama ? "border-red-500" : ""
                  }`}
                  placeholder="Nama lengkap"
                />
                {errors.nama && (
                  <p className="text-xs text-red-500 mt-1">{errors.nama}</p>
                )}
              </div>

              {/* Peran */}
              <div>
                <label className="block text-sm mb-1">Sebagai Apa</label>
                <input
                  value={form.peran}
                  onChange={(e) => onChange("peran", e.target.value)}
                  className={`w-full px-3 py-2 border rounded ${
                    errors.peran ? "border-red-500" : ""
                  }`}
                  placeholder="Auditee / Auditor 1 / Auditor 2 / Verifikator"
                />
                {errors.peran && (
                  <p className="text-xs text-red-500 mt-1">{errors.peran}</p>
                )}
              </div>

              {/* Pesan */}
              <div>
                <label className="block text-sm mb-1">Keterangan Masalah</label>
                <textarea
                  rows={4}
                  value={form.pesan}
                  onChange={(e) => onChange("pesan", e.target.value)}
                  className={`w-full px-3 py-2 border rounded ${
                    errors.pesan ? "border-red-500" : ""
                  }`}
                  placeholder="Jelaskan kronologi masalah"
                />
                {errors.pesan && (
                  <p className="text-xs text-red-500 mt-1">{errors.pesan}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded"
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-500"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
