import React, { useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import ProkerAnnouncementCard from "./ProkerAnnouncementCard";
import MonitoringTableCard from "./MonitoringTableCard";
import MonitoringIndikatorCard from "./MonitoringIndikatorCard";

const DashboardPage = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const { level, setLevel, listLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />

      <main className="p-6 space-y-6">
        {/* ANNOUNCEMENT */}
        <ProkerAnnouncementCard
          status="Ditutup"
          closedAt="25 Januari 2026, 23:59 WIB"
        />

        {/* TABLE CARD */}
        <MonitoringTableCard/>

        {/* //[pr] belum muncul info card activity */}

        <MonitoringIndikatorCard/>
      </main>
    </>
  );
};

export default DashboardPage;