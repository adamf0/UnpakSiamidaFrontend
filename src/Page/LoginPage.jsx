import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/Common/api";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { Eye, EyeOff } from "lucide-react";
import slide1 from "@/assets/slide1.jpeg";
import slide2 from "@/assets/slide2.jpeg";
import slide3 from "@/assets/slide3.jpeg";

const images = [
  slide1,slide2,slide3
];

const LoginPage = () => {
  return (
    <div>
      <LoginContent />
    </div>
  );
};

function LoginContent() {
  const { addToast } = useToast();
  const { setUser, setToken } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onTouched" });

  useEffect(() => {
    const preloadImages = async () => {
      await Promise.all(
        images.map(
          (src) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.src = src;
              img.onload = resolve;
              img.onerror = reject;
            })
        )
      );
      setIsLoaded(true);
    };
    preloadImages();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const onSubmit = async (data) => {
    const dataForm = new FormData();
    dataForm.append("username",data.username);
    dataForm.append("password",data.password);

    setLoading(true);

    try {
      const res = await apiClient.post("/login", dataForm); 
      const body = res.data;
      console.log(body);

      if (body.error) {
        addToast("error", body.error);
        // setErrorMessage(body.error);
      } else {
        localStorage.removeItem("activeLevel");
        localStorage.removeItem("activeLevelYear");
        localStorage.setItem("token", body.access_token);
        localStorage.setItem("refresh", body.refresh_token);

        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      const status = err?.status ?? err?.response?.status;
      const resData = err?.data ?? err?.response?.data;
      const isHtml =
        typeof resData === "string" &&
        (/<html/i.test(resData) ||
          /<!doctype/i.test(resData) ||
          /<body/i.test(resData) ||
          /<title>404/i.test(resData) ||
          resData.trim().startsWith("<"));

      if ((status === 404 && isHtml) || status === 404) {
        addToast("error", "username atau password tidak tepat");
      } else if (typeof resData === "object" && resData !== null) {
        addToast(
          "error",
          resData.message || resData.error || err.message || "ada masalah pada aplikasi"
        );
      } else if (err?.message && !isHtml) {
        addToast("error", err.message);
      } else {
        addToast("error", "ada masalah pada aplikasi");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-row bg-gray-50">
      {/* Kolom 1 - Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl mb-3 shadow-2xs">
              S
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Masuk ke SIAMIDA
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Sistem Penjaminan Mutu Internal & Program Kerja Universitas Pakuan
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Masukkan username"
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 transition ${
                  errors.username
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                    : "border-gray-300 focus:ring-purple-500/20 focus:border-purple-700"
                }`}
                {...register("username", {
                  required: "Username harus diisi",
                })}
              />
              {errors.username && (
                <p className="text-rose-500 text-xs mt-1 font-medium">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className={`w-full border rounded-lg px-3.5 py-2.5 pr-11 text-sm text-gray-800 focus:outline-none focus:ring-2 transition ${
                    errors.password
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                      : "border-gray-300 focus:ring-purple-500/20 focus:border-purple-700"
                  }`}
                  {...register("password", {
                    required: "Password harus diisi",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-semibold py-2.5 rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                "Masuk ke Sistem"
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Universitas Pakuan. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </div>

      {/* Kolom 2 - Image Slider */}
      <div className="hidden md:block w-full md:w-1/2 relative overflow-hidden bg-purple-950">
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={images[currentIndex]}
              src={images[currentIndex]}
              alt={`Slide ${currentIndex}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Gradient Vignette & Institutional Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-950/40 to-black/20" />

        {/* Top badge */}
        <div className="absolute top-10 left-10 right-10 text-white z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium tracking-wide shadow-sm">
            <span>Sistem Informasi Akreditasi & Mutu Internal</span>
          </div>
        </div>

        {/* Bottom institutional text */}
        <div className="absolute bottom-16 left-10 right-10 text-white z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Universitas Pakuan
          </h2>
          <p className="text-sm text-purple-100 mt-2 max-w-md leading-relaxed drop-shadow-xs">
            Mewujudkan tata kelola mutu akademik dan keterpaduan rencana operasional proker yang unggul, mandiri, dan berkarakter.
          </p>
        </div>

        {/* Bullet Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === idx ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;