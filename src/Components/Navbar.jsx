import { useEffect, useRef, useState } from "react";
import { Popover } from "@headlessui/react";
import { Bell, User, Menu, Calendar, Layers, ChevronDown, Check } from "lucide-react";
import { mappedText } from "@/Common/Utils";
import { useSidebar } from "@/Providers/SidebarProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { APP_VERSIONS, getVersionConfig } from "@/Common/versionConfig";
import ChangeLevelModal from "@/Components/ChangeLevelModal";

const Navbar = ({ renderChangeLevelModal }) => {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const {
    serverYears,
    activeYear,
    positionYear,
    setPositionYear,
    changeYear,
    level,
    listLevel,
    openChangeLevel,
    setOpenChangeLevel,
    changeLevel,
    appVersion,
    changeAppVersion,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const currentVersionConfig = getVersionConfig(appVersion || "v2");

  const [notifications] = useState([
    { id: 1, message: "Notifikasi 1" },
    { id: 2, message: "Notifikasi 2" },
  ]);

  // State modal mobile
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

  // useEffect(() => {
  //   onMobileModeListener(notifModalOpen || yearModalOpen);
  // }, [notifModalOpen, yearModalOpen]);

  return (
    <>
      <nav className="bg-purple-400 border-b p-4 flex justify-between items-center">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button onClick={() => toggleSidebar()} className="lg:hidden">
            <Menu className="hover:text-white" size={20} />
          </button>
          <button onClick={() => toggleSidebar()} className="hidden lg:flex">
            <Menu className="hover:text-white" size={20} />
          </button>

          {/* Versioning selection for admin */}
          {isAdmin && (
            <Popover className="relative">
              {({ open, close }) => (
                <>
                  <Popover.Button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-white/95 hover:bg-white text-gray-800 border border-purple-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-300"
                    title="Filter Menu Berdasarkan Versi Aplikasi"
                  >
                    <Layers size={16} className="text-purple-600 shrink-0" />
                    <span className="font-semibold text-purple-900">
                      {currentVersionConfig?.code?.toUpperCase() || "V2"}
                    </span>
                    <span className="hidden sm:inline text-gray-400">|</span>
                    <span className="hidden sm:inline text-gray-700 text-xs">
                      {currentVersionConfig?.tag || "Current"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Popover.Button>

                  <Popover.Panel className="absolute left-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                    <div className="px-3.5 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                          <Layers size={13} className="text-purple-600" />
                          Versi Aplikasi
                        </span>
                        <span className="text-[10px] bg-purple-200/80 text-purple-900 font-semibold px-2 py-0.5 rounded-full">
                          Admin Filter
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                        Filter menu sidebar berdasarkan versi sistem & periode audit
                      </p>
                    </div>

                    <div className="p-1.5 space-y-1 max-h-80 overflow-y-auto">
                      {(APP_VERSIONS || []).map((item) => {
                        const isSelected = (appVersion || "v2") === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              changeAppVersion(item.id);
                              close();
                            }}
                            className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? "bg-purple-50 border border-purple-200 text-purple-950 font-medium"
                                : "hover:bg-gray-50 text-gray-700 border border-transparent"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                                  <Check size={11} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-gray-300" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-semibold">
                                  {item.label}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium border shrink-0 ${item.tagColor}`}
                                >
                                  {item.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                                {item.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Popover.Panel>
                </>
              )}
            </Popover>
          )}

          {/* Tahun selection (desktop only) - Disembunyikan untuk admin */}
          {!isAdmin && (
            <Popover className="relative hidden sm:block">
              {({ close }) => (
                <>
                  <Popover.Button className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm hover:bg-gray-100 cursor-pointer">
                    <Calendar size={16} />
                    <span>{positionYear || activeYear || "2026"}</span>
                    {String(positionYear) === String(activeYear) ? (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Open Now
                      </span>
                    )}
                  </Popover.Button>

                  <Popover.Panel className="absolute left-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50">
                    <ul className="text-sm max-h-64 overflow-y-auto">
                      {(serverYears ?? []).map((item) => {
                        const year = String(item.Tahun ?? item.tahun ?? "");
                        const isActive =
                          String(item.Status || item.status || "").toLowerCase() === "active" ||
                          String(item.Status || item.status || "").toLowerCase() === "aktif";
                        const isPosition = year === String(positionYear);

                        return (
                          <li
                            key={year}
                            onClick={() => {
                              if (changeYear) changeYear(year);
                              else setPositionYear(year);
                              close();
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center
                              ${isPosition ? "bg-gray-100 font-medium" : ""}
                            `}
                          >
                            <span>{year}</span>
                            {isActive && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 rounded-full">
                                Active
                              </span>
                            )}
                            {!isActive && isPosition && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
                                Open
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Popover.Panel>
                </>
              )}
            </Popover>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* Desktop: notifications */}
          <Popover className="relative hidden sm:block">
            <Popover.Button
              className={`p-2 rounded-full hover:bg-gray-100 ${
                notifications.length ? "border-2 border-black" : ""
              }`}
            >
              <Bell size={18} />
            </Popover.Button>

            <Popover.Panel className="z-50 absolute right-0 mt-2 w-64 bg-[#f6f6f6] shadow-lg rounded-lg p-4">
              <h3 className="font-semibold mb-2">Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n, i) => (
                    <li key={i} className="text-sm border-b pb-1">
                      {n.message}
                    </li>
                  ))}
                </ul>
              )}
            </Popover.Panel>
          </Popover>

          {/* User menu */}
          <Popover className="relative">
            <Popover.Button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100">
              <User size={18} />
              <span className="hidden lg:inline text-sm">{user?.name ?? "-"}</span>
            </Popover.Button>

            <Popover.Panel className="z-50 absolute right-0 mt-2 w-62 bg-[#f6f6f6] border rounded-md shadow-lg p-4 text-sm">
              <div className="border-b pb-2 mb-2">
                <div className="text-sm font-medium">{user?.name ?? "-"}</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{mappedText(level)}</span>
                  {listLevel.length > 0 && (
                    <button
                      onClick={() => setOpenChangeLevel(true)}
                      className="text-blue-500 hover:underline"
                    >
                      Change Level
                    </button>
                  )}
                </div>
              </div>

              {/* MENU */}
              <div className="py-1 text-sm space-y-2">
                <button
                  className="sm:hidden w-full rounded text-left px-4 hover:bg-gray-100 flex justify-between items-center"
                  onClick={() => setNotifModalOpen(true)}
                >
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {!isAdmin && (
                  <button
                    className="sm:hidden w-full rounded text-left px-4 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => setYearModalOpen(true)}
                  >
                    <span>Pilih Tahun</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {positionYear}
                    </span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    className="sm:hidden w-full rounded text-left px-4 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => setVersionModalOpen(true)}
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-purple-600" />
                      Versi Aplikasi
                    </span>
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {currentVersionConfig?.code?.toUpperCase() || "V2"}
                    </span>
                  </button>
                )}

                <button className="w-full rounded text-left px-4 hover:bg-gray-100">
                  Settings
                </button>
                <button
                  className="w-full rounded text-left px-4 hover:bg-red-50 text-red-600"
                  onClick={() => logout()}
                >
                  Logout
                </button>
              </div>
            </Popover.Panel>
          </Popover>
        </div>
      </nav>

      {renderChangeLevelModal ? (
        renderChangeLevelModal()
      ) : (
        <ChangeLevelModal
          open={openChangeLevel}
          onClose={() => setOpenChangeLevel(false)}
          levels={listLevel}
          currentLevel={level}
          onSubmit={(lvl) => {
            if (typeof changeLevel === "function") {
              changeLevel(lvl);
            } else {
              setOpenChangeLevel(false);
            }
          }}
        />
      )}

      {/* Notifications Modal */}
      {notifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-80 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <button
                onClick={() => setNotifModalOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No notifications</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="text-sm border-b pb-1">
                    {n.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tahun Modal - Disembunyikan untuk admin */}
      {!isAdmin && yearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-72 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Pilih Tahun</h3>
              <button
                onClick={() => setYearModalOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            <ul className="text-sm max-h-64 overflow-y-auto">
              {(serverYears ?? []).map((item) => {
                const year = String(item.Tahun ?? item.tahun ?? "");
                const isActive = String(item.Status || item.status || "").toLowerCase() === "active" || String(item.Status || item.status || "").toLowerCase() === "aktif";
                const isPosition = year === String(positionYear);
                return (
                  <li
                    key={year}
                    onClick={() => {
                      if (changeYear) changeYear(year);
                      else setPositionYear(year);
                      setYearModalOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
                      isPosition ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    <span>{year}</span>
                    {isActive && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 rounded-full">
                        Active
                      </span>
                    )}
                    {!isActive && isPosition && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
                        Open
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {/* Versi Modal (Mobile) - Khusus admin */}
      {isAdmin && versionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b bg-purple-50">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-purple-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Pilih Versi Aplikasi</h3>
              </div>
              <button
                onClick={() => setVersionModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
              {(APP_VERSIONS || []).map((item) => {
                const isSelected = (appVersion || "v2") === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      changeAppVersion(item.id);
                      setVersionModalOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-purple-50 border border-purple-200 text-purple-950 font-medium"
                        : "hover:bg-gray-50 text-gray-700 border border-transparent"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium border shrink-0 ${item.tagColor}`}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
