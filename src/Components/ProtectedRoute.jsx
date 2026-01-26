import { useAuth } from "@/Providers/AuthProvider";
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const { expired } = useAuth();

  if (expired || !sessionStorage.getItem("token")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}