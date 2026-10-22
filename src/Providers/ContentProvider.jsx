import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { APP_VERSIONS, getVersionConfig } from "@/Common/versionConfig";

const ContentContext = createContext(null);

// const isUUID = (v) =>
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const ContentProvider = ({ children }) => {
  const { user } = useAuth();
  const [serverYears, setServerYears] = useState([]);
  const [positionYear, setPositionYear] = useState(() => {
    return localStorage.getItem("positionYear") || "2026";
  });

  /* ================= VERSIONING ================= */
  const [appVersion, setAppVersion] = useState(() => {
    return localStorage.getItem("appVersion") || "v2";
  });

  const changeAppVersion = (verId) => {
    setAppVersion(verId);
    localStorage.setItem("appVersion", verId);

    // Otomatis sesuaikan tahun jika relevan dengan versi
    const cfg = getVersionConfig(verId);
    if (cfg?.defaultYear) {
      setPositionYear(cfg.defaultYear);
      localStorage.setItem("positionYear", cfg.defaultYear);
    }
  };

  /* ================= YEAR ================= */
  const fetchYears = async () => {
    try {
      const [renstraRes, prokerRes] = await Promise.allSettled([
        apiClient.get("/tahunrenstras?mode=all"),
        apiClient.get("/mastertahuns?mode=all"),
      ]);

      const renstraList = renstraRes.status === "fulfilled" ? (renstraRes.value?.data || []) : [];
      const prokerList = prokerRes.status === "fulfilled" ? (prokerRes.value?.data || []) : [];

      const map = new Map();
      [...prokerList, ...renstraList].forEach((item) => {
        const y = String(item.Tahun ?? item.tahun ?? "").trim();
        if (y && !map.has(y)) {
          map.set(y, {
            ...item,
            Tahun: y,
            tahun: y,
            Status: item.Status || item.status || "no-active",
            status: item.Status || item.status || "no-active",
          });
        }
      });

      setServerYears(Array.from(map.values()));
    } catch (err) {
      console.error("Fetch years error:", err);
    }
  };

  useEffect(() => {
    fetchYears();
  }, [user]);

  // Gabungkan tahun dari server dan tahun dari penugasan ABAC (user.extra_role)
  const availableYears = useMemo(() => {
    const list = [...(serverYears || [])];
    const existing = new Set(list.map((item) => String(item.Tahun ?? item.tahun)));

    if (Array.isArray(user?.extra_role)) {
      user.extra_role.forEach((r) => {
        const y = String(r.tahun ?? r.Tahun ?? "").trim();
        if (y && !existing.has(y)) {
          existing.add(y);
          list.push({
            Tahun: y,
            tahun: y,
            Status: "active",
            status: "active",
            isExtraRole: true,
          });
        }
      });
    }

    return list.sort((a, b) => {
      const ya = parseInt(a.Tahun ?? a.tahun ?? 0, 10);
      const yb = parseInt(b.Tahun ?? b.tahun ?? 0, 10);
      return yb - ya;
    });
  }, [serverYears, user?.extra_role]);

  const activeYear = useMemo(() => {
    const stored = localStorage.getItem("positionYear");
    if (stored) return stored;

    // Prioritaskan tahun dari penugasan ABAC (extra_role)
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      const uYear = String(user.extra_role[0].tahun ?? user.extra_role[0].Tahun ?? "");
      if (uYear) return uYear;
    }

    // Default ke tahun active dari list
    const activeFromList = availableYears.find(
      (y) => {
        const s = String(y.Status || y.status || "").toLowerCase();
        return s === "active" || s === "aktif";
      }
    );
    if (activeFromList) return String(activeFromList.Tahun ?? activeFromList.tahun);

    if (availableYears.length > 0) {
      return String(availableYears[0].Tahun ?? availableYears[0].tahun);
    }

    return "2026";
  }, [availableYears, user?.extra_role]);

  /* ================= LEVEL ================= */
  const [level, setLevel] = useState(() => {
    return localStorage.getItem("activeLevel") || null;
  });
  const [listLevel, setListLevel] = useState([]);

  /* ================= MODAL ================= */
  const [openChangeLevel, setOpenChangeLevel] = useState(false);

  /* ================= EFFECT ================= */
  useEffect(() => {
    if (!user) return;

    // === ADMIN / FAKULTAS ===
    if (user?.level === "admin" || user?.level === "fakultas") {
      setLevel(user.level);
      setListLevel([user.level]);
      return;
    }

    // === ROLE BASED ON YEAR (ABAC / Extra Roles) ===
    const userBaseLevel = (user?.level || "user").toLowerCase();
    
    // Ambil semua role yang cocok dengan tahun yang sedang aktif (positionYear)
    const matchingRoles = (user?.extra_role ?? [])
      .filter((m) => String(m.tahun ?? m.Tahun) === String(positionYear))
      .map((m) => String(m.role ?? m.Role).toLowerCase());

    // Gabungkan level dasar pengguna ("user") dengan role penugasan ABAC
    const allRoles = Array.from(new Set([userBaseLevel, ...matchingRoles])).filter(Boolean);

    setListLevel(allRoles);

    // Tentukan level yang aktif
    const savedLevel = localStorage.getItem("activeLevel");
    if (savedLevel && allRoles.includes(savedLevel)) {
      setLevel(savedLevel);
    } else if (matchingRoles.length > 0) {
      // Prioritaskan role penugasan (UPML, UPMF, UPMS) agar langsung aktif
      setLevel(matchingRoles[0]);
      localStorage.setItem("activeLevel", matchingRoles[0]);
    } else {
      setLevel(userBaseLevel);
      localStorage.setItem("activeLevel", userBaseLevel);
    }
  }, [positionYear, user]);

  useEffect(() => {
    if (activeYear && !positionYear) {
      setPositionYear(String(activeYear));
      localStorage.setItem("positionYear", String(activeYear));
    } else if (positionYear && availableYears.length > 0 && user?.level !== "admin") {
      const exists = availableYears.some((y) => String(y.Tahun ?? y.tahun) === String(positionYear));
      if (!exists && activeYear) {
        setPositionYear(String(activeYear));
        localStorage.setItem("positionYear", String(activeYear));
      }
    }
  }, [activeYear, positionYear, availableYears, user?.level]);

  useEffect(() => {
    if (positionYear) {
      localStorage.setItem("positionYear", positionYear);
    }
  }, [positionYear]);

  /* ================= ACTIONS ================= */
  const changeYear = (year) => {
    setPositionYear(String(year));
    localStorage.setItem("positionYear", String(year));
  };

  const changeLevel = (val) => {
    if (!listLevel.includes(val)) return;
    setLevel(val);
    localStorage.setItem("activeLevel", val);
    setOpenChangeLevel(false);
  };

  return (
    <ContentContext.Provider
      value={{
        // versioning
        appVersion,
        setAppVersion: changeAppVersion,
        changeAppVersion,
        APP_VERSIONS,

        // year
        serverYears: availableYears,
        availableYears,
        activeYear,
        positionYear,
        setPositionYear,
        changeYear,

        // level
        level,
        setLevel,
        listLevel,
        changeLevel,

        // modal
        openChangeLevel,
        setOpenChangeLevel,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("useContent must be used inside ContentProvider");
  }
  return ctx;
};
