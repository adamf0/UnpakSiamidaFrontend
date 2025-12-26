import { useState } from "react";
import { Popover } from "@headlessui/react";
import { Bell, User, Menu, Calendar } from "lucide-react";
import { mappedText } from "@/Common/Utils";
import { useSidebar } from "@/Providers/SidebarProvider";

const Navbar = ({
  userName,
  userLevel,
  activeYear,
  positionYear,
  years,
  onPositionChange,
  onChangeLevelClick,
  renderChangeLevelModal,
}) => {
  const { isSidebarOpen, toggleSidebar, isCollapsed } = useSidebar();

  const [notifications] = useState([
    { id: 1, message: "Notifikasi 1" },
    { id: 2, message: "Notifikasi 2" },
  ]);

  return (
    <>
      <nav className="bg-purple-400 border-b p-4 flex justify-between items-center">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button onClick={()=>toggleSidebar()} className="lg:hidden">
            <Menu className="hover:text-white" size={20} />
          </button>
          <button onClick={()=>toggleSidebar()} className="hidden lg:flex">
            <Menu className="hover:text-white" size={20} />
          </button>

          {activeYear &&
          <Popover className="relative">
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

            <Popover.Panel className="absolute left-0 mt-2 w-44 bg-white border rounded-md shadow-lg">
              <ul className="text-sm">
                {years.map((item) => {
                  const year = item.Tahun;
                  const isActive = item.Status === "active";
                  const isPosition = year === positionYear;

                  return (
                    <li
                      key={year}
                      onClick={() => onPositionChange(year)}
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
          }
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <Popover className="relative">
            <Popover.Button
                className={`p-2 rounded-full hover:bg-gray-100
                ${notifications.length ? "border-2 border-black" : ""}
                `}
            >
                <Bell size={18} />
            </Popover.Button>

            <Popover.Panel className="z-50 absolute right-0 mt-2 w-64 bg-[#f6f6f6] shadow-lg rounded-lg p-4 z-50">
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

          <Popover className="relative">
            <Popover.Button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100">
              <User size={18} />
              <span className="hidden lg:inline text-sm">{userName}</span>
            </Popover.Button>

            <Popover.Panel className="z-50 absolute right-0 mt-2 w-62 bg-[#f6f6f6] border rounded-md shadow-lg p-4">
                <div className="border-b pb-2 mb-2">
                    <div className="text-sm font-medium">{userName}</div>
                    <div className="flex justify-between text-xs text-gray-500">
                    <span>{mappedText(userLevel)}</span>
                    <button
                        onClick={onChangeLevelClick}
                        className="text-blue-500 hover:underline"
                    >
                        Change Level
                    </button>
                    </div>
                </div>

                {/* MENU */}
                <div className="py-1 text-sm">
                    <button
                        className="w-full rounded text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => {

                        }}
                    >Settings</button>

                    <button
                        className="w-full rounded text-left px-4 py-2 hover:bg-red-50 text-red-600"
                        onClick={() => {

                        }}
                    >Logout</button>
                </div>
            </Popover.Panel>
          </Popover>
        </div>
      </nav>

      {renderChangeLevelModal?.()}
    </>
  );
};

export default Navbar;
