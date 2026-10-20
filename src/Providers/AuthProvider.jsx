import React, { createContext, useContext, useState } from "react";
import { apiClient } from "../Common/api";

const AuthContext = createContext(null);

const decodeJWT = (jwt) => {
  if (!jwt || typeof jwt !== "string") return null;
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binString = atob(base64);
    try {
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return JSON.parse(binString);
    }
  } catch {
    return null;
  }
};

const nowInSeconds = () => Math.floor(Date.now() / 1000);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  /* ======================
   * TOKEN CHECK
   * ====================== */

  const cleanTokenString = (t) => {
    if (!t || typeof t !== "string") return "";
    return t.startsWith("Bearer ") ? t.slice(7).trim() : t.trim();
  };

  const isTokenExpired = (rawToken) => {
    const token = cleanTokenString(rawToken ?? sessionStorage.getItem("token"));
    if (!token) return true;

    const payload = decodeJWT(token);
    if (payload?.exp) {
      return payload.exp <= nowInSeconds();
    }

    return token.split(".").length !== 3;
  };

  const isRefreshExpired = (rawRefresh) => {
    const refresh = cleanTokenString(rawRefresh ?? sessionStorage.getItem("refresh"));
    if (!refresh) return true;

    const payload = decodeJWT(refresh);
    if (payload?.exp) {
      return payload.exp <= nowInSeconds();
    }

    return refresh.split(".").length !== 3;
  };

  const isSessionExpired = () => {
    return isTokenExpired() && isRefreshExpired();
  };

  /* ======================
   * TOKEN PICKER
   * ====================== */

  const getValidToken = () => {
    const rawToken = cleanTokenString(sessionStorage.getItem("token"));
    if (rawToken && !isTokenExpired(rawToken)) return rawToken;

    const rawRefresh = cleanTokenString(sessionStorage.getItem("refresh"));
    if (rawRefresh && !isRefreshExpired(rawRefresh)) return rawRefresh;

    // Fallback: if rawToken exists and has valid 3-part structure, return it
    if (rawToken && rawToken.split(".").length === 3) {
      return rawToken;
    }

    return null;
  };

  /* ======================
   * USER INFO
   * ====================== */

  const fetchUserInfo = async () => {
    setUserLoading(true);
    setUserError(null);

    try {
      const validToken = getValidToken();
      if (!validToken) throw new Error("Session expired");

      const res = await apiClient.get("/whoami");
      const data = res.data;

      const rawExtra = data.ExtraRole || data.extra_role || [];
      let extraRoles = Array.isArray(rawExtra) ? [...rawExtra] : [];

      // Cek dan lengkapi dari user_abac untuk non-admin
      if (data.UUID && data.Level !== "admin") {
        try {
          const abacRes = await apiClient.get(`/user-abac?user_uuid=${data.UUID}`);
          const abacData = abacRes.data || [];
          abacData.forEach((item) => {
            const status = String(item.Status || item.status || "").toLowerCase();
            if (status && status !== "active" && status !== "aktif") return;

            const role = (item.ComputedRole || item.computed_role || item.Role || item.role || "").toLowerCase();
            const tahun = String(item.Tahun || item.tahun || "");
            const fuId = item.IdFakultasUnit || item.id_fakultas_unit;
            const fuNama = item.NamaFakultasUnit || item.nama_fakultas_unit;
            if (tahun && role) {
              const already = extraRoles.some(
                (r) => String(r.tahun ?? r.Tahun) === tahun && String(r.role ?? r.Role).toLowerCase() === role
              );
              if (!already) {
                extraRoles.push({
                  tahun,
                  role,
                  id_fakultas_unit: fuId,
                  nama_fakultas_unit: fuNama,
                });
              }
            }
          });
        } catch (e) {
          console.warn("Fetch user-abac for whoami fallback:", e);
        }
      }

      setUser({
        uuid: data.UUID,
        name: data.Name,
        level: data.Level,
        email: data.Email,
        fakultas_unit: data.FakultasUnit,
        extra_role: extraRoles,
      });

      return {
        ...data,
        ExtraRole: extraRoles,
      };
    } catch (err) {
      setUser(null);
      setUserError("Session expired");
      throw err;
    } finally {
      setUserLoading(false);
    }
  };

  /* ======================
   * LOGOUT
   * ====================== */

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("positionYear");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setToken,
        isSessionExpired,
        getValidToken,
        fetchUserInfo,
        logout,
        userLoading,
        userError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
