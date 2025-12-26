import { useAuth } from "@/Providers/AuthProvider";
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // const { token } = useAuth();
  // return token  ? <Outlet /> : <Navigate to="/" replace />;
  return <Outlet />;
}