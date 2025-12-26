import {
  IoNotificationsOutline,
  IoFileTrayStacked,
  IoCalendarOutline,
} from "react-icons/io5";
import { LiaHomeSolid } from "react-icons/lia";
import { FaRegUser, FaFileAlt } from "react-icons/fa";
import { BsPersonLock } from "react-icons/bs";
import { HiOutlineDocumentText } from "react-icons/hi";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";

const Sidebar = ({ isOpen, toggleSidebar, isCollapsed }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const { token } = useAuth();
  const { addToast } = useToast();

  const active =
    "bg-white text-[#1f2937] font-medium shadow-sm";
  const inactive =
    "text-[#4b5563] hover:bg-white hover:text-[#1f2937]";

  const menu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LiaHomeSolid size={22} />,
    },
    {
      name: "Standar Renstra",
      path: "/standar_renstra",
      icon: <IoFileTrayStacked size={20} />,
    },
    {
      name: "Indikator Renstra",
      path: "/indikator_renstra",
      icon: <FaRegUser size={18} />,
    },
    {
      name: "Jenis File Audit",
      path: "/jenis_file_audit",
      icon: <BsPersonLock size={20} />,
    },
    {
      name: "Template Renstra",
      path: "/template_renstra",
      icon: <HiOutlineDocumentText size={20} />,
    },
    {
      name: "Template Dokumen Tambahan",
      path: "/template_dokumen_tambahan",
      icon: <FaFileAlt size={18} />,
    },
    {
      name: "Schedulling",
      path: "/schedulling",
      icon: <IoCalendarOutline size={20} />,
    },
    {
      name: "Report",
      path: "/report",
      icon: <IoNotificationsOutline size={20} />,
    },
  ];

  return (
    <>
      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen bg-[#F3F4F6] border-r
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* HEADER / LOGO */}
        <div className="h-16 flex items-center justify-center border-b">
          <span
            className={`text-lg font-bold transition-all ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            SIAMIDA
          </span>
        </div>

        {/* MENU */}
        <nav className="p-3">
          <ul className="flex flex-col gap-1">
            {menu.map((item) => {
              const isActive = currentPath.startsWith(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={toggleSidebar}
                    className={`
                      flex items-center gap-3
                      p-3 rounded-lg transition-all
                      ${isActive ? active : inactive}
                    `}
                  >
                    <div className="min-w-[24px] flex justify-center">
                      {item.icon}
                    </div>

                    <span
                      className={`text-sm transition-all ${
                        isCollapsed ? "hidden" : "block"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* OVERLAY MOBILE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
