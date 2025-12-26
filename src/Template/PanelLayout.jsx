import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import { useSidebar } from "../Providers/SidebarProvider";

const PanelLayout = () => {
  const { isSidebarOpen, toggleSidebar, isCollapsed } = useSidebar();

  return (
    <div className="md:flex h-screen">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isCollapsed={isCollapsed} 
      />

      <div className="lg:ml-64 md:flex-1 md:flex md:flex-col">
        <Outlet />
      </div>
    </div>
  );
};
export default PanelLayout;