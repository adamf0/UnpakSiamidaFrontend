import { useAuth } from "@/Providers/AuthProvider";
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const { expired } = useAuth();

  return !expired  ? <Outlet /> : <Navigate to="/" replace />;
}