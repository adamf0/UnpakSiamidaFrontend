import React, { useEffect, useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";

const DashboardPage = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  // ================= SERVER DATA =================
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

  // ================= YEAR =================
  const activeYear = serverYears.find(y => y.Status === "active")?.Tahun;
  const [positionYear, setPositionYear] = useState(activeYear);

  // ================= LEVEL =================
  const [level, setLevel] = useState(null);       // admin | user
  const [listLevel, setListLevel] = useState([]); // admin | auditor1 | auditee | auditor2

  // ================= MODAL =================
  const [open, setOpen] = useState(false);

  const isUUID = (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  useEffect(() => {
    console.log(positionYear)
    const sessionUser = sessionStorage.getItem("user");

    if (!sessionUser || !isUUID(sessionUser)) {
        setLevel("admin");
        setListLevel(prev => {
            if (prev.includes("admin")) return prev;
            return [...prev, "admin"];
        });
    }

    const modes = serverMode
        .filter(m => String(m.Tahun) === String(positionYear))
        .map(m => m.val);

    // setListLevel(prev => {
    //     const merged = [...prev, ...modes];
    //     return [...new Set(merged)];
    // });
    setLevel(modes.length==0? "user":modes[0]);
    setListLevel(modes.length==0? ["user"]:modes);
  }, [positionYear]);

  return (
    <>
      <Navbar
        userName="John Doe"
        userLevel={level}
        years={serverYears}
        activeYear={activeYear}
        positionYear={positionYear}
        onPositionChange={setPositionYear}
        onChangeLevelClick={() => setOpen(true)}
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={open}
            onClose={() => setOpen(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpen(false);
            }}
          />
        )}
      />

      <main className="p-6" />
    </>
  );
};

export default DashboardPage;
