import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "@/Providers/ToastProvider";
// import { cn, getInformation } from "@/lib/utils";
import { useAuth } from "@/Providers/AuthProvider";

const images = [
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
  "https://images.unsplash.com/photo-1506765515384-028b60a970df",
];

const LoginPage = () => {
  return (
    <div className="bottom-5 left-5">
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
      const res = await axios.post("http://localhost:1000/login", dataForm); 
      const body = res.data;
      console.log(body);

      if (body.error) {
        addToast("error", body.error);
        // setErrorMessage(body.error);
      } else {
        sessionStorage.setItem("token", body.access_token);
        sessionStorage.setItem("refresh", body.refresh_token);

        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      const data = err.response.data;

      if (typeof data === "object" && data !== null) {
        addToast("error", data.message);
      }
      else {
        addToast("error", "ada masalah pada aplikasi");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-row">
      {/* Kolom 1 - Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
            Login
          </h1>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                className={
                  `w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${errors.email
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"}`
                }
                // value="admin_rbac@yopmail.com"
                {...register("username", {
                  required: "username harus diisi",
                })}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-600"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className={
                    `w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${errors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"}`
                  }
                  {...register("password", {
                    required: "Password harus diisi",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.008 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.008-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.59 16.392 7.46 19.5 12 19.5c.993 0 1.953-.138 2.86-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.639 0 8.574 3.008 9.963 7.178a10.523 10.523 0 01-4.379 5.043M6.228 6.228L3 3m3.228 3.228l12.544 12.544"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>

          {/* <div className="mt-4 text-sm text-center">
            <p className="text-gray-500">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => alert("Hubungi admin")}
              >
                Ask Admin
              </button>
            </p>
          </div> */}
        </div>
      </div>

      {/* Kolom 2 - Image Slider */}
      <div className="hidden md:block w-full md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={images[currentIndex]}
              src={images[currentIndex]}
              alt={`Slide ${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Bullet Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={
                `w-3 h-3 rounded-full transition ${currentIndex === idx ? "bg-white" : "bg-white/50"}`
              }
            ></button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;