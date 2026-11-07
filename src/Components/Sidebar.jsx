import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Target,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  FileText,
  FilePlus,
  ClipboardList,
  CalendarDays,
  FolderKanban,
  Activity,
  FileCheck,
  Files,
  CalendarClock,
  ScrollText,
  FileSearch,
  FileBarChart,
  ChevronDown,
} from "lucide-react";
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

  const { level, appVersion, positionYear, activeYear } = useContent();
  const { user } = useAuth();
  const currentLevel = String(level || "").toLowerCase().trim();
  const isAdmin = currentLevel === "admin" || String(user?.level || "").toLowerCase().trim() === "admin";
  const selectedYear = parseInt(positionYear || activeYear || "2026", 10);
  const effectiveVersion =
    selectedYear >= 2027
      ? "v3"
      : selectedYear <= 2023
      ? "v1"
      : "v2";
  const currentVerConfig = getVersionConfig(effectiveVersion);
  const rawFu =
    user?.fakultas_unit ??
    user?.id_fakultas_unit ??
    user?.FakultasUnit ??
    user?.uuid_fakultas_unit ??
    "";
  const fuVal = String(rawFu).trim();
  const directHasUnit =
    fuVal !== "" && fuVal !== "0" && fuVal !== "null" && fuVal !== "undefined";

  // Penugasan unit ABAC hanya berlaku jika role penugasan adalah "user"
  const hasUserRoleUnit =
    Array.isArray(user?.extra_role) &&
    user.extra_role.some((r) => {
      const rRole = String(r.role ?? r.Role ?? "").toLowerCase().trim();
      if (rRole !== "user") return false;
      const rYear = String(r.tahun ?? r.Tahun ?? "").trim();
      if (positionYear && rYear && rYear !== String(positionYear)) return false;
      const id = String(
        r.id_fakultas_unit ?? r.IdFakultasUnit ?? r.uuid_fakultas_unit ?? ""
      ).trim();
      return id !== "" && id !== "0" && id !== "null" && id !== "undefined";
    });

  const hasFakultasUnit = directHasUnit || hasUserRoleUnit;
  const hasAuditRole =
    currentLevel === "auditee" ||
    currentLevel === "auditor1" ||
    currentLevel === "auditor2" ||
    (Array.isArray(user?.extra_role) &&
      user.extra_role.some((r) => {
        const role = String(r.role ?? r.Role ?? "").toLowerCase().trim();
        return role === "auditee" || role === "auditor1" || role === "auditor2";
      }));
  const [closedGroups, setClosedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setClosedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const active =
    "bg-purple-50 text-purple-900 border-r-2 border-purple-700 font-semibold shadow-2xs";
  const inactive =
    "text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-normal transition-colors";

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
              icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Master Data",
          items: [
            {
              name: "Account User",
              path: "/users",
              icon: <Users size={18} strokeWidth={1.5} />,
            },
            {
              name: "Master Tahun",
              path: "/master_tahun",
              icon: <Calendar size={18} strokeWidth={1.5} />,
            },
            {
              name: "Standar Renstra",
              path: "/standar_renstra",
              icon: <Layers size={18} strokeWidth={1.5} />,
            },
            {
              name: "Indikator Renstra",
              path: "/indikator_renstra",
              icon: <Target size={18} strokeWidth={1.5} />,
            },
            {
              name: "Jenis File Audit",
              path: "/jenis_file_audit",
              icon: <ShieldCheck size={18} strokeWidth={1.5} />,
            },
            {
              name: "Analisis SWOT",
              path: "/swot",
              icon: <BarChart2 size={18} strokeWidth={1.5} />,
            },
            {
              name: "Analisis Risiko",
              path: "/risk_assessment",
              icon: <AlertTriangle size={18} strokeWidth={1.5} />,
            },
            {
              name: "Template Renstra",
              path: "/template_renstra",
              icon: <FileText size={18} strokeWidth={1.5} />,
            },
            {
              name: "Template Dokumen Tambahan",
              path: "/template_dokumen_tambahan",
              icon: <FilePlus size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <ClipboardList size={18} strokeWidth={1.5} />,
            },
            {
              name: "Jadwal Proker",
              path: "/jadwal_proker",
              icon: <CalendarDays size={18} strokeWidth={1.5} />,
            },
            {
              name: "Mata Program",
              path: "/mata_program",
              icon: <FolderKanban size={18} strokeWidth={1.5} />,
            },
            {
              name: "Aktivitas",
              path: "/aktivitas",
              icon: <Activity size={18} strokeWidth={1.5} />,
            },
            {
              name: "Pelaporan Pelaksanaan",
              path: "/pelaporan_pelaksanaan",
              icon: <FileCheck size={18} strokeWidth={1.5} />,
            },
            {
              name: "Pelaporan Dokumen",
              path: "/pelaporan_dokumen",
              icon: <Files size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Auditing",
          items: [
            {
              name: "Schedule Audit",
              path: "/schedule_audit",
              icon: <CalendarClock size={18} strokeWidth={1.5} />,
            },
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <ScrollText size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Report",
          items: [
            {
              name: "Report",
              path: "/report",
              icon: <FileBarChart size={18} strokeWidth={1.5} />,
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
              icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <ClipboardList size={18} strokeWidth={1.5} />,
            },
            {
              name: "Analisis SWOT",
              path: "/swot",
              icon: <BarChart2 size={18} strokeWidth={1.5} />,
            },
            {
              name: "Analisis Risiko",
              path: "/risk_assessment",
              icon: <AlertTriangle size={18} strokeWidth={1.5} />,
            },
            {
              name: "Mata Program",
              path: "/mata_program",
              icon: <FolderKanban size={18} strokeWidth={1.5} />,
            },
            {
              name: "Aktivitas",
              path: "/aktivitas",
              icon: <Activity size={18} strokeWidth={1.5} />,
            },
            {
              name: "Pelaporan Pelaksanaan",
              path: "/pelaporan_pelaksanaan",
              icon: <FileCheck size={18} strokeWidth={1.5} />,
            },
            {
              name: "Pelaporan Dokumen",
              path: "/pelaporan_dokumen",
              icon: <Files size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Auditing",
          items: [
            ...(selectedYear >= 2024
              ? [
                  {
                    name: "Audit",
                    path: "/audit",
                    icon: <FileSearch size={18} strokeWidth={1.5} />,
                  },
                ]
              : []),
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <ScrollText size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Report",
          items: [
            {
              name: "Report",
              path: "/report",
              icon: <FileBarChart size={18} strokeWidth={1.5} />,
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
              icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
            },
          ],
        },
        {
          group: "Proker",
          items: [
            {
              name: "Program Kerja",
              path: "/proker_v3",
              icon: <ClipboardList size={18} strokeWidth={1.5} />,
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
              icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
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
                    icon: <ClipboardList size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Analisis SWOT",
                    path: "/swot",
                    icon: <BarChart2 size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Analisis Risiko",
                    path: "/risk_assessment",
                    icon: <AlertTriangle size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Mata Program",
                    path: "/mata_program",
                    icon: <FolderKanban size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Aktivitas",
                    path: "/aktivitas",
                    icon: <Activity size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Pelaporan Pelaksanaan",
                    path: "/pelaporan_pelaksanaan",
                    icon: <FileCheck size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Pelaporan Dokumen",
                    path: "/pelaporan_dokumen",
                    icon: <Files size={18} strokeWidth={1.5} />,
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
              icon: <FileSearch size={18} strokeWidth={1.5} />,
            },
            {
              name: "Berita Acara",
              path: "/berita_acara",
              icon: <ScrollText size={18} strokeWidth={1.5} />,
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
              icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
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
                    icon: <ClipboardList size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Analisis SWOT",
                    path: "/swot",
                    icon: <BarChart2 size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Analisis Risiko",
                    path: "/risk_assessment",
                    icon: <AlertTriangle size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Mata Program",
                    path: "/mata_program",
                    icon: <FolderKanban size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Aktivitas",
                    path: "/aktivitas",
                    icon: <Activity size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Pelaporan Pelaksanaan",
                    path: "/pelaporan_pelaksanaan",
                    icon: <FileCheck size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Pelaporan Dokumen",
                    path: "/pelaporan_dokumen",
                    icon: <Files size={18} strokeWidth={1.5} />,
                  },
                ],
              },
            ]
          : []),
        ...((hasAuditRole || selectedYear >= 2024)
          ? [
              {
                group: "Auditing",
                items: [
                  {
                    name: "Audit",
                    path: "/audit",
                    icon: <FileSearch size={18} strokeWidth={1.5} />,
                  },
                  {
                    name: "Berita Acara",
                    path: "/berita_acara",
                    icon: <ScrollText size={18} strokeWidth={1.5} />,
                  },
                ],
              },
            ]
          : []),
      ];
    }

    const isVerifierRole = [
      "upml",
      "upmf",
      "upms",
      "anggaran",
      "keuangan",
      "evaluator",
    ].includes(currentLevel);

    return groups
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (
            isVerifierRole &&
            (item.path === "/proker_v3" || item.path.startsWith("/proker_v3/"))
          ) {
            return true;
          }
          return isMenuVisibleForVersion(item.path, effectiveVersion);
        }),
      }))
      .filter((section) => section.items && section.items.length > 0);
  }

  return (
    <>
      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen h-[100svh] max-h-[100svh]
          bg-white border-r border-gray-200/90 shadow-sm
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          w-64
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* HEADER / LOGO */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
              S
            </div>
            <div className={`transition-all ${isCollapsed ? "hidden" : "block"}`}>
              <div className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                SIAMIDA
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-1 py-0.2 rounded">
                  UNPAK
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-normal">
                Sistem Penjaminan Mutu
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE VERSION BADGE (ADMIN) */}
        {isAdmin && !isCollapsed && (
          <div className="px-3 pt-2.5 pb-1 shrink-0">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-50/60 border border-purple-100">
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
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <span>{section.group}</span>
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
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
                        const isV2 = isV2FeaturePath(item.path) && item.path !== "/audit" && item.path !== "/berita_acara";
                        const isV3 = isV3FeaturePath(item.path);

                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={closeSidebarOnMobile}
                              className={`
                                flex items-center justify-between
                                px-3 py-2 rounded-lg transition-all text-sm
                                ${isActive ? active : inactive}
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`min-w-[20px] flex justify-center shrink-0 ${
                                    isActive ? "text-purple-700" : "text-gray-400 group-hover:text-gray-600"
                                  }`}
                                >
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

                              {isV2 && !isCollapsed && (
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

