import { useState } from "react";
import {
  IoNotificationsOutline,
  IoFileTrayStacked,
  IoCalendarOutline,
  IoChevronDownOutline,
  IoStatsChartOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { LiaHomeSolid } from "react-icons/lia";
import { FaRegUser, FaFileAlt, FaUsersCog } from "react-icons/fa";
import { BsPersonLock } from "react-icons/bs";
import { HiOutlineDocumentText, HiOutlineClipboardList } from "react-icons/hi";
import { Link, useLocation } from "react-router-dom";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import {
  isMenuVisibleForVersion,
  isV2FeaturePath,
  isV3FeaturePath,
  getVersionConfig,
} from "@/Common/versionConfig";

const Sidebar = ({ isOpen, toggleSidebar, closeSidebarOnMobile, isCollapsed }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const { level, appVersion } = useContent();
  const { user } = useAuth();
  const currentLevel = String(level || "").toLowerCase().trim();
  const isAdmin = currentLevel === "admin" || String(user?.level || "").toLowerCase().trim() === "admin";
  const currentVerConfig = getVersionConfig(appVersion || "v2");
  const hasFakultasUnit = !isEmpty(String(user?.fakultas_unit ?? ""));
  const [closedGroups, setClosedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setClosedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const active = "bg-white text-[#1f2937] font-medium shadow-sm";
  const inactive = "text-[#4b5563] hover:bg-white hover:text-[#1f2937]";

  function getMenuGroups() {
    let groups = [];

    if (currentLevel === "admin") {
      groups = [
        {
          group: null,
          items: [
            {
              name: "Dashboard",
              path: "/dashboard",
              icon: <LiaHomeSolid size={22} />,
            },
          ],
        },
        {
          group: "Master Data",
          items: [
            {
              name: "Account User",
              path: "/users",
              icon: <FaUsersCog size={19} />,
            },
            {
              name: "Master Tahun",
              path: "/master_tahun",
              icon: <IoCalendarOutline size={20} />,
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
              name: "Analisis SWOT",
              path: "/swot",
              icon: <IoStatsChartOutline size={20} />,
            },
            {
              name: "Analisis Risiko",
              path: "/risk_assessment",
              icon: <IoWarningOutline size={20} />,
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
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <HiOutlineClipboardList size={20} />,
            },
            {
              name: "Mata Program",
              path: "/mata_program",
              icon: <IoFileTrayStacked size={20} />,
            },
            {
              name: "Aktivitas",
              path: "/aktivitas",
              icon: <HiOutlineDocumentText size={20} />,
            },
            {
              name: "Pelaporan Pelaksanaan",
              path: "/pelaporan_pelaksanaan",
              icon: <FaFileAlt size={18} />,
            },
            {
              name: "Pelaporan Dokumen",
              path: "/pelaporan_dokumen",
              icon: <IoFileTrayStacked size={18} />,
            },
          ],
        },
        {
          group: "Auditing",
          items: [
            {
              name: "Schedule Audit",
              path: "/schedule_audit",
              icon: <IoCalendarOutline size={20} />,
            },
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <IoNotificationsOutline size={20} />,
            },
          ],
        },
        {
          group: "Report",
          items: [
            {
              name: "Report",
              path: "/report",
              icon: <IoNotificationsOutline size={20} />,
            },
          ],
        },
      ];
    } else if (currentLevel === "fakultas") {
      groups = [
        {
          group: null,
          items: [
            {
              name: "Dashboard",
              path: "/dashboard",
              icon: <LiaHomeSolid size={22} />,
            },
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <HiOutlineClipboardList size={19} />,
            },
            {
              name: "Analisis SWOT",
              path: "/swot",
              icon: <IoStatsChartOutline size={19} />,
            },
            {
              name: "Analisis Risiko",
              path: "/risk_assessment",
              icon: <IoWarningOutline size={19} />,
            },
            {
              name: "Aktivitas",
              path: "/aktivitas",
              icon: <HiOutlineDocumentText size={20} />,
            },
            {
              name: "Pelaporan Pelaksanaan",
              path: "/pelaporan_pelaksanaan",
              icon: <FaFileAlt size={18} />,
            },
            {
              name: "Pelaporan Dokumen",
              path: "/pelaporan_dokumen",
              icon: <IoFileTrayStacked size={18} />,
            },
          ],
        },
        {
          group: "Auditing",
          items: [
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <IoNotificationsOutline size={20} />,
            },
          ],
        },
        {
          group: "Report",
          items: [
            {
              name: "Report",
              path: "/report",
              icon: <IoNotificationsOutline size={20} />,
            },
          ],
        },
      ];
    } else if (
      currentLevel === "upml" ||
      currentLevel === "upmf" ||
      currentLevel === "upms" ||
      currentLevel === "anggaran" ||
      currentLevel === "keuangan" ||
      currentLevel === "evaluator"
    ) {
      groups = [
        {
          group: null,
          items: [
            {
              name: "Dashboard",
              path: "/dashboard",
              icon: <LiaHomeSolid size={22} />,
            },
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <HiOutlineClipboardList size={19} />,
            },
          ],
        },
      ];
    } else if (
      currentLevel === "auditee" ||
      currentLevel === "auditor1" ||
      currentLevel === "auditor2"
    ) {
      groups = [
        {
          group: null,
          items: [
            {
              name: "Dashboard",
              path: "/dashboard",
              icon: <LiaHomeSolid size={22} />,
            },
          ],
        },
        ...(currentLevel === "auditee" || hasFakultasUnit
          ? [
              {
                group: "Proker",
                items: [
                  {
                    name: "Program Kerja",
                    path: "/proker_v3",
                    icon: <HiOutlineClipboardList size={19} />,
                  },
                  {
                    name: "Analisis SWOT",
                    path: "/swot",
                    icon: <IoStatsChartOutline size={19} />,
                  },
                  {
                    name: "Analisis Risiko",
                    path: "/risk_assessment",
                    icon: <IoWarningOutline size={19} />,
                  },
                  {
                    name: "Aktivitas",
                    path: "/aktivitas",
                    icon: <HiOutlineDocumentText size={20} />,
                  },
                  {
                    name: "Pelaporan Pelaksanaan",
                    path: "/pelaporan_pelaksanaan",
                    icon: <FaFileAlt size={18} />,
                  },
                  {
                    name: "Pelaporan Dokumen",
                    path: "/pelaporan_dokumen",
                    icon: <IoFileTrayStacked size={18} />,
                  },
                ],
              },
            ]
          : []),
        {
          group: "Auditing",
          items: [
            {
              name: "Audit",
              path: "/audit",
              icon: <IoNotificationsOutline size={20} />,
            },
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <IoNotificationsOutline size={20} />,
            },
          ],
        },
      ];
    } else {
      groups = [
        {
          group: null,
          items: [
            {
              name: "Dashboard",
              path: "/dashboard",
              icon: <LiaHomeSolid size={22} />,
            },
          ],
        },
        ...(hasFakultasUnit
          ? [
              {
                group: "Proker",
                items: [
                  {
                    name: "Program Kerja",
                    path: "/proker_v3",
                    icon: <HiOutlineClipboardList size={19} />,
                  },
                  {
                    name: "Analisis SWOT",
                    path: "/swot",
                    icon: <IoStatsChartOutline size={19} />,
                  },
                  {
                    name: "Analisis Risiko",
                    path: "/risk_assessment",
                    icon: <IoWarningOutline size={19} />,
                  },
                  {
                    name: "Aktivitas",
                    path: "/aktivitas",
                    icon: <HiOutlineDocumentText size={20} />,
                  },
                  {
                    name: "Pelaporan Pelaksanaan",
                    path: "/pelaporan_pelaksanaan",
                    icon: <FaFileAlt size={18} />,
                  },
                  {
                    name: "Pelaporan Dokumen",
                    path: "/pelaporan_dokumen",
                    icon: <IoFileTrayStacked size={18} />,
                  },
                ],
              },
            ]
          : []),
      ];
    }

    return groups
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          isMenuVisibleForVersion(item.path, appVersion)
        ),
      }))
      .filter((section) => section.items && section.items.length > 0);
  }

  return (
    <>
      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen h-[100svh] max-h-[100svh]
          bg-[#F3F4F6] border-r
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          w-64
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* HEADER / LOGO */}
        <div className="h-16 shrink-0 flex items-center justify-center border-b">
          <span
            className={`text-lg font-bold transition-all ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            SIAMIDA
          </span>
        </div>

        {/* ACTIVE VERSION BADGE (ADMIN) */}
        {isAdmin && !isCollapsed && (
          <div className="px-3 pt-2.5 pb-1 shrink-0">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-200/60 border border-gray-200">
              <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                Mode Versi
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-tight ${currentVerConfig.tagColor}`}
              >
                {currentVerConfig.shortLabel}
              </span>
            </div>
          </div>
        )}

        {/* MENU */}
        <nav className="p-3 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-3 pb-8">
            {getMenuGroups().map((section, idx) => {
              const isGroupOpen = section.group
                ? !closedGroups[section.group]
                : true;

              return (
                <div key={section.group || `section-${idx}`}>
                  {section.group && !isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(section.group)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <span>{section.group}</span>
                      <IoChevronDownOutline
                        size={14}
                        className={`transition-transform duration-200 ${
                          isGroupOpen ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </button>
                  )}

                  {section.group && isCollapsed && (
                    <div className="my-1.5 border-t border-gray-300 mx-2" />
                  )}

                  {(isGroupOpen || isCollapsed) && (
                    <ul className="flex flex-col gap-1 mt-1">
                      {section.items.map((item) => {
                        const isActive = currentPath.startsWith(item.path);
                        const isV2 = isV2FeaturePath(item.path);
                        const isV3 = isV3FeaturePath(item.path);

                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={closeSidebarOnMobile}
                              className={`
                                flex items-center justify-between
                                p-3 rounded-lg transition-all
                                ${isActive ? active : inactive}
                              `}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="min-w-[24px] flex justify-center shrink-0">
                                  {item.icon}
                                </div>

                                <span
                                  className={`text-sm truncate transition-all ${
                                    isCollapsed ? "hidden" : "block"
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </div>

                              {isAdmin && isV2 && !isCollapsed && (
                                <span
                                  className={`
                                    text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 transition-colors
                                    ${
                                      isActive
                                        ? "bg-purple-100 text-purple-700 border-purple-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }
                                  `}
                                  title="Fitur Versi 2 (Aktif 2024-2026)"
                                >
                                  V2
                                </span>
                              )}

                              {isV3 && !isCollapsed && (
                                <span
                                  className={`
                                    text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 transition-colors
                                    ${
                                      isActive
                                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    }
                                  `}
                                  title="Fitur Versi 3 (Audit 2027)"
                                >
                                  V3
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
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

