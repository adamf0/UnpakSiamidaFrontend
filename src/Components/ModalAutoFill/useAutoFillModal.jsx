import { useState } from "react";

export const useAutoFillModalFill = () => {
  const [modalFill, setModalFill] = useState({
    openFill: false,
    activeKeyFill: null,
    activeGroupFill: null,
  });

  const openModalFill = (target) => {
    const isAll = Array.isArray(target);
    setModalFill({
      openFill: true,
      activeKeyFill: isAll
        ? `Semua Kelompok (${target.length} kelompok)`
        : target.Jenjang
          ? `${target.Type.toUpperCase()} - ${target.Jenjang.toUpperCase()}`
          : target.Type.toUpperCase(),
      activeGroupFill: target,
    });
  };

  const closeModalFill = () => {
    setModalFill({
      openFill: false,
      activeKeyFill: null,
      activeGroupFill: null,
    });
  };

  const { activeGroupFill } = modalFill;

  return { modalFill, activeGroupFill, openModalFill, closeModalFill };
};
