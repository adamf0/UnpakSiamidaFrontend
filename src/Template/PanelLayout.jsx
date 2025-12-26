import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import { useSidebar } from "../Providers/SidebarProvider";
import { ContentProvider } from "@/Providers/ContentProvider";

const PanelLayout = () => {
  const { isSidebarOpen, toggleSidebar, closeSidebarOnMobile, isCollapsed } = useSidebar();

  return (
    <div className="md:flex h-screen">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        closeSidebarOnMobile={closeSidebarOnMobile}
        isCollapsed={isCollapsed} 
      />

      <div
          className={`
            md:flex-1 md:flex md:flex-col
            transition-all duration-300
            ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}
          `}
      >
        <ContentProvider>
            <Outlet />
        </ContentProvider>
      </div>
    </div>
  );
};
export default PanelLayout;