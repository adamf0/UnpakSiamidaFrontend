import { createPortal } from "react-dom";

export default function Portal({ children }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}
