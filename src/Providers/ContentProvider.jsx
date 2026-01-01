import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";

const ContentContext = createContext(null);

// const isUUID = (v) =>
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const ContentProvider = ({ children }) => {
  const {user, getValidToken} = useAuth();
  const [serverYears, setServerYears] = useState([]);
  const [positionYear, setPositionYear] = useState(null);

  /* ================= YEAR ================= */
  const activeYear = useMemo(
    () => serverYears.find((y) => y.Status === "active")?.Tahun ?? null,
    [serverYears]
  );

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const token = await getValidToken();

        const res = await fetch("http://localhost:3000/tahunrenstras?mode=all", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) throw new Error("Gagal mengambil tahun");

        const data = await res.json();
        setServerYears(data);
      } catch (err) {
        console.error("Fetch tahunrenstras error:", err);
      }
    };

    fetchYears();
  }, [getValidToken]);

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

  useEffect(()=>{
    console.log(activeYear)
    if(!activeYear) return;

    setPositionYear(activeYear);
  },[activeYear]);

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
