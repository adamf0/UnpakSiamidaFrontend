import axios from "axios";
import React, { createContext, useContext, useState } from "react";

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

      const res = await axios.get("http://localhost:3000/whoami", {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      const data = res.data;

      setUser({
        uuid: data.UUID,
        name: data.Name,
        level: data.Level,
        email: data.Email,
        fakultas_unit: data.FakultasUnit,
        extra_role: data.ExtraRole,
      });

      return data;
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
