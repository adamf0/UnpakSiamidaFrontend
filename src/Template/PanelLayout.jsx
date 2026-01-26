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
      return  <div className="md:flex h-screen">
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
                      <Outlet />
                  </div>
              </div>
    }
  }
  return render();
};
export default PanelLayout;