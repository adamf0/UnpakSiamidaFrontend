import { useState } from "react";

export const useAutoFillModalFill = () => {
  const [modalFill, setModalFill] = useState({
    openFill: false,
    activeKeyFill: null,
    activeGroupFill: null,
  });

  const openModalFill = (gd) => {
    setModalFill({
      openFill: true,
      activeKeyFill: `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()}`,
      activeGroupFill: gd,
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
