import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Mail, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";

export default function ConfirmSendEmailDialog({
  open,
  users = [],
  loading = false,
  onConfirm,
  onClose,
}) {
  const show = Boolean(open);
  const total = users.length;
  const usersWithEmail = users.filter((u) => Boolean(u?.Email || u?.email));
  const usersWithoutEmail = users.filter((u) => !Boolean(u?.Email || u?.email));

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={loading ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl border border-gray-100 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail size={24} strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg font-bold text-gray-900 leading-snug">
                      Kirim Email Akun SIAMIDA V3
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-1">
                      Kredensial username, password, dan role akan dikirimkan melalui antrean background job.
                    </p>
                  </div>
                </div>

                {/* SUMMARY STATS */}
                <div className="mt-4 p-3.5 rounded-xl bg-gray-50/90 border border-gray-200/80 text-xs text-gray-700 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total akun yang dipilih:</span>
                    <span className="font-bold text-gray-900">{total} akun</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Memiliki alamat email:</span>
                    </span>
                    <span className="font-semibold">{usersWithEmail.length} akun</span>
                  </div>
                  {usersWithoutEmail.length > 0 && (
                    <div className="flex items-center justify-between text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tanpa email (dilewati):</span>
                      </span>
                      <span className="font-bold">{usersWithoutEmail.length} akun</span>
                    </div>
                  )}
                </div>

                {/* PREVIEW LIST */}
                <div className="mt-3.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Daftar Penerima ({usersWithEmail.length}):
                  </label>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 text-xs">
                    {usersWithEmail.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 italic">
                        Tidak ada akun dengan email valid
                      </div>
                    ) : (
                      usersWithEmail.map((u, i) => (
                        <div key={u.UUID || u.uuid || i} className="p-2.5 flex items-center justify-between hover:bg-gray-50/80">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-gray-800 truncate">
                              {u.Name || u.name || u.Username || u.nidn_username}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono truncate">
                              {u.Email || u.email}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {u.Level || u.level || "user"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* EMAIL TEMPLATE PREVIEW NOTE */}
                <div className="mt-4 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Format Notifikasi Email:</span>
                  </div>
                  <div className="italic text-gray-600 font-mono text-[10.5px] bg-white/80 p-2 rounded border border-indigo-100/60 mt-1 whitespace-pre-line">
                    {"kami sampaikan akun SIAMIDA V3 sebagai berikut :\n\nusername : [username]\npassword : [password]\nlevel : [role]\n\nbuka siamida.unpak.ac.id dan pilih SIAMIDA V3.\n\nTerimakasih"}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading || usersWithEmail.length === 0}
                    className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                        <span>Memproses Outbox...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Kirim ke {usersWithEmail.length} Email</span>
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
