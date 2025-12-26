import { useState } from "react";

export const useErrorModal = () => {
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  const openModal = ({ title, message }) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, open: false });
  };

  return { modal, openModal, closeModal };
};
