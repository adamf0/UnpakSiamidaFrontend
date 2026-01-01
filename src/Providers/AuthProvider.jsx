import { delay } from "@/Common/Utils";
import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const decodeJWT = (jwt) => {
  try {
    const payload = jwt.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};
const nowInSeconds = () => Math.floor(Date.now() / 1000);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [expired, setExpired] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  /* ======================
   * TOKEN CHECK
   * ====================== */

  const isTokenExpired = () => {
    const token = sessionStorage.getItem("token");
    if (!token) return true;

    const payload = decodeJWT(token);
    if (!payload?.exp) return true;

    return payload.exp <= nowInSeconds();
  };

  const isRefreshExpired = () => {
    const refresh = sessionStorage.getItem("refresh");
    if (!refresh) return true;

    const payload = decodeJWT(refresh);
    if (!payload?.exp) return true;

    return payload.exp <= nowInSeconds();
  };

  const isSessionExpired = () => {
    return isTokenExpired() && isRefreshExpired();
  };

  /* ======================
   * TOKEN PICKER
   * ====================== */

  const getValidToken = () => {
    if (!isTokenExpired()) return sessionStorage.getItem("token");
    if (!isRefreshExpired()) return sessionStorage.getItem("refresh");
    return null;
  };

  /* ======================
   * USER INFO
   * ====================== */

  const fetchUserInfo = async () => {
    setUserLoading(true);
    setUserError(null);
    await delay(5000);

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
        "uuid":data.UUID,
        "name":data.Name,
        "level":data.Level,
        "email":data.Email,
        "fakultas_unit":data.FakultasUnit,
        "extra_role":data.ExtraRole,
      });
      return res.data;
    } catch (err) {
      console.error(err);
      const data = err.response.data;

      if (typeof data === "object" && data !== null) {
        setUserError(data.message);
      }
      else {
        addToast("error", );
        setUserError("ada masalah pada aplikasi");
      }

      throw err;
    } finally {
      setUserLoading(false);
    }
  };

  /* ======================
   * EFFECT
   * ====================== */

  useEffect(() => {
    setExpired(isSessionExpired());
  }, []);

  /* ======================
   * LOGOUT
   * ====================== */

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refresh");
    setUser(null);
    setToken(null);
    setExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        expired,
        setUser,
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
