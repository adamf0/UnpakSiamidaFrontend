import React, { useEffect, useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";

const DashboardPage = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const {
    serverYears,
    activeYear,
    positionYear,
    setPositionYear,
    changeYear,

    level,
    setLevel,
    listLevel,
    changeLevel,

    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  return (
    <>
      <Navbar
        userName="John Doe"
        userLevel={level}
        years={serverYears}
        activeYear={activeYear}
        positionYear={positionYear}
        onPositionChange={setPositionYear}
        onChangeLevelClick={() => setOpenChangeLevel(true)}
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

      <main className="p-6" />
    </>
  );
};

export default DashboardPage;
