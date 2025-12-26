import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ContentContext = createContext(null);

/* ===== MOCK SERVER ===== */
const serverYears = [
  { Tahun: "2027", Status: "no-active" },
  { Tahun: "2026", Status: "no-active" },
  { Tahun: "2025", Status: "active" },
  { Tahun: "2024", Status: "no-active" },
];

const serverMode = [
  { Tahun: "2026", val: "auditor1" },
  { Tahun: "2025", val: "auditee" },
  { Tahun: "2024", val: "auditor2" },
];

const isUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const ContentProvider = ({ children }) => {
  /* ================= YEAR ================= */
  const activeYear = useMemo(
    () => serverYears.find((y) => y.Status === "active")?.Tahun,
    []
  );

  const [positionYear, setPositionYear] = useState(activeYear);

  /* ================= LEVEL ================= */
  const [level, setLevel] = useState(null);
  const [listLevel, setListLevel] = useState([]);

  /* ================= MODAL ================= */
  const [openChangeLevel, setOpenChangeLevel] = useState(false);

  /* ================= EFFECT ================= */
  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");

    // === ADMIN ===
    if (!sessionUser || !isUUID(sessionUser)) {
      setLevel("admin");
      setListLevel(["admin"]);
      return;
    }

    // === ROLE BASED ON YEAR ===
    const modes = serverMode
      .filter((m) => String(m.Tahun) === String(positionYear))
      .map((m) => m.val);

    if (modes.length === 0) {
      setLevel("user");
      setListLevel(["user"]);
    } else {
      setLevel(modes[0]);
      setListLevel(modes);
    }
  }, [positionYear]);

  /* ================= ACTIONS ================= */
  const changeYear = (year) => {
    setPositionYear(year);
  };

  const changeLevel = (val) => {
    if (!listLevel.includes(val)) return;
    setLevel(val);
    setOpenChangeLevel(false);
  };

  return (
    <ContentContext.Provider
      value={{
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
