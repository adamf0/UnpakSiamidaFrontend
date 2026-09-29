import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import { useSidebar } from "../Providers/SidebarProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useEffect } from "react";
import ErrorPage from "@/Page/ErrorPage";
import FullPageLoading from "@/Page/FullPageLoading";

const PanelLayout = () => {
  const { isSidebarOpen, toggleSidebar, closeSidebarOnMobile, isCollapsed } = useSidebar();
  const {userLoading, userError, fetchUserInfo} = useAuth();

  useEffect(()=>{
    fetchUserInfo();
  },[]);

  function render(){
    if(userLoading){
      return <FullPageLoading/>
    } else if(userError){
      return <ErrorPage message={userError}/>
    } else{
      return  <div className="flex flex-col md:flex-row h-screen h-[100svh] max-h-[100svh] overflow-hidden overscroll-none">
                  <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={toggleSidebar} 
                    closeSidebarOnMobile={closeSidebarOnMobile}
                    isCollapsed={isCollapsed} 
                  />

                  <div
                      className={`
                        flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden overscroll-contain
                        transition-all duration-300
                        ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}
                      `}
                  >
                      <Outlet />
                  </div>
              </div>
    }
  }
  return render();
};
export default PanelLayout;