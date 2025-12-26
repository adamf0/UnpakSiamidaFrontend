import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const getStoredUser = () => {
    try {
      const raw = sessionStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);

      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }

      return null;
    } catch (err) {
      return null;
    }
  };

  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [expired, setExpired] = useState(() => {
    const currentUser = getStoredUser();
    if (currentUser && currentUser.expires_at) {
      return new Date(currentUser.expires_at) < new Date();
    }
    return false;
  });

//   const isUserAccess = () => {
//     try {
//       const storedUser = sessionStorage.getItem("user");
//       const info = storedUser ? JSON.parse(storedUser) : null;
//       return info.user_access==1;
//     } catch {
//       return false;
//     }
//   };

//   const isAdminAccess = () => {
//     try {
//       const storedUser = sessionStorage.getItem("user");
//       const info = storedUser ? JSON.parse(storedUser) : null;
//       return info.admin_access==1;
//     } catch {
//       return false;
//     }
//   };

//   const isCompanyAccess = () => {
//     try {
//       const storedUser = sessionStorage.getItem("user");
//       const info = storedUser ? JSON.parse(storedUser) : null;
//       return info.company_access==1;
//     } catch {
//       return false;
//     }
//   };

  const isExpired = () => {
    try {
      const storedUser = sessionStorage.getItem("user");
      const info = storedUser ? JSON.parse(storedUser) : null;
      return info?.expires_at ? new Date(info.expires_at) < new Date() : false;
    } catch {
      return false;
    }
  };

  // Sinkronisasi antar tab
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "user" || event.key === "token") {
        const storedUser = sessionStorage.getItem("user");
        const storedToken = sessionStorage.getItem("token");

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);

          if (parsedUser.expires_at) {
            setExpired(new Date(parsedUser.expires_at) < new Date());
          }
        } else {
          setUser(null);
          setToken(null);
          setExpired(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const refreshSession = async () => {
  try {
    const storedUserRaw = sessionStorage.getItem("user");
    const storedTokenRaw = sessionStorage.getItem("token");

    if (!storedUserRaw || !storedTokenRaw) {
      console.warn("⚠️ Tidak ada sesi");
      return;
    }

    const storedUser = JSON.parse(storedUserRaw);
    const expiresAt = new Date(storedUser.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      console.info("🔄 Token sudah expired, memproses refresh...");

      const res = await axios.post(
        "https://staging-backend.rbac.asj-shipagency.co.id/api/v1/refresh-token",
        {},
        {
          headers: { Authorization: `Bearer ${storedTokenRaw}` },
        }
      );

      const body = res.data;
      const newToken = body?.data?.auth?.token ?? null;
      const newExpiresAt = body?.data?.auth?.expires_at ?? null;

      if (newToken && newExpiresAt) {
        const updatedUser = {
          ...storedUser,
          expires_at: newExpiresAt,
        };

        // Simpan ulang ke sessionStorage
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        sessionStorage.setItem("token", newToken);

        // Update state React
        setUser(updatedUser);
        setToken(newToken);
        setExpired(new Date(newExpiresAt) < new Date());

        console.info("✅ Session refreshed successfully");
      } else {
        console.warn("⚠️ Invalid token structure:", body);
      }
    }
  } catch (error) {
    console.error("❌ Error refreshing session:", error.response?.data || error.message);
    logout();
  }
};


  const logout = () => { 
    try { 
      sessionStorage.removeItem("user"); 
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("info"); 
    } catch (error) { 
      console.error("Error removing session:", error); 
    } finally { 
      setUser(null); 
      setToken(null); 
      setExpired(false);
    } 
  };

  return (
    <AuthContext.Provider value={{ user, token, expired, setUser, setToken, refreshSession, logout, isExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);