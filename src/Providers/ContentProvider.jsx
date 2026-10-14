import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { APP_VERSIONS, getVersionConfig } from "@/Common/versionConfig";

const ContentContext = createContext(null);

// const isUUID = (v) =>
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const ContentProvider = ({ children }) => {
  const {user, getValidToken} = useAuth();
  const [serverYears, setServerYears] = useState([]);
  const [positionYear, setPositionYear] = useState(() => {
    return sessionStorage.getItem("positionYear");
  });

  /* ================= VERSIONING ================= */
  const [appVersion, setAppVersion] = useState(() => {
    return sessionStorage.getItem("appVersion") || "v2";
  });

  const changeAppVersion = (verId) => {
    setAppVersion(verId);
    sessionStorage.setItem("appVersion", verId);

    // Otomatis sesuaikan tahun jika relevan dengan versi
    const cfg = getVersionConfig(verId);
    if (cfg?.defaultYear) {
      setPositionYear(cfg.defaultYear);
      sessionStorage.setItem("positionYear", cfg.defaultYear);
    }
  };

  /* ================= YEAR ================= */
  const activeYear = useMemo(
    () => sessionStorage.getItem("positionYear") ?? serverYears.find((y) => y.Status === "active")?.Tahun ?? null,
    [serverYears]
  );

  const fetchYears = async () => {
    try {
      const res = await apiClient.get("/tahunrenstras?mode=all");
      setServerYears(res.data || []);
    } catch (err) {
      console.error("Fetch tahunrenstras error:", err);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  /* ================= LEVEL ================= */
  const [level, setLevel] = useState(null);
  const [listLevel, setListLevel] = useState([]);

  /* ================= MODAL ================= */
  const [openChangeLevel, setOpenChangeLevel] = useState(false);

  /* ================= EFFECT ================= */
  useEffect(() => {
    if(!user) return;

    // === ADMIN ===
    if (user?.level=="admin" || user?.level=="fakultas") {
      setLevel(user.level);
      setListLevel([user.level]);
      return;
    }

    // === ROLE BASED ON YEAR ===
    const modes = (user?.extra_role ?? [])
      .filter((m) => String(m.tahun) === String(positionYear))
      .map((m) => m.role);

    if (modes.length === 0) {
      setLevel("user");
      setListLevel(["user"]);
    } else {
      setLevel(modes[0]);
      setListLevel(modes);
    }
  }, [positionYear, user]);

  useEffect(() => {
    if (activeYear && !positionYear) {
      setPositionYear(String(activeYear));
    }
  }, [activeYear, positionYear]);

  useEffect(() => { //jika sudah di set saat refresh gunakan defaulnya pakai sesionstorage bukan dari active year
    if (positionYear) {
      sessionStorage.setItem("positionYear", positionYear);
    }
  }, [positionYear]);

  /* ================= ACTIONS ================= */
  const changeYear = (year) => {
    setPositionYear(year);
    sessionStorage.setItem("positionYear", String(year));
  };

  const changeLevel = (val) => {
    if (!listLevel.includes(val)) return;
    setLevel(val);
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
        serverYears,
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
