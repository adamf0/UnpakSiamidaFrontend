import { useEffect, useRef, useState } from "react";
import { Popover } from "@headlessui/react";
import { Bell, User, Menu, Calendar } from "lucide-react";
import { mappedText } from "@/Common/Utils";
import { useSidebar } from "@/Providers/SidebarProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";

const Navbar = ({ renderChangeLevelModal }) => {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const {
    serverYears,
    activeYear,
    positionYear,
    setPositionYear,
    level,
    listLevel,
    setOpenChangeLevel,
  } = useContent();

  const [notifications] = useState([
    { id: 1, message: "Notifikasi 1" },
    { id: 2, message: "Notifikasi 2" },
  ]);

  // State modal mobile
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);

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

          {/* Tahun selection (desktop only) */}
          <Popover className="relative hidden sm:block">
            <Popover.Button className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm hover:bg-gray-100">
              <Calendar size={16} />
              <span>{positionYear}</span>
              {positionYear === activeYear ? (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Active
                </span>
              ) : (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Open Now
                </span>
              )}
            </Popover.Button>

            <Popover.Panel className="absolute left-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-50">
              <ul className="text-sm">
                {(serverYears ?? []).map((item) => {
                  const year = item.Tahun;
                  const isActive = item.Status === "active";
                  const isPosition = year === positionYear;

                  return (
                    <li
                      key={year}
                      onClick={() => setPositionYear(year)}
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
          </Popover>
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

                <button
                  className="sm:hidden w-full rounded text-left px-4 hover:bg-gray-100 flex justify-between items-center"
                  onClick={() => setYearModalOpen(true)}
                >
                  <span>Pilih Tahun</span>
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {positionYear}
                  </span>
                </button>

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

      {renderChangeLevelModal?.()}

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

      {/* Tahun Modal */}
      {yearModalOpen && ( //kok listener onMobileModeListener selalu null ya, harusnya ketika ini kebuka update listener active=
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
              {serverYears.map((item) => {
                const year = item.Tahun;
                const isActive = item.Status === "active";
                const isPosition = year === positionYear;
                return (
                  <li
                    key={year}
                    onClick={() => {
                      setPositionYear(year);
                      setYearModalOpen(false);
                    }}
                    className={`px-3 py-1 cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
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
    </>
  );
};

export default Navbar;
