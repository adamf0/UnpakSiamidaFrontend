// SidebarContext.js
import { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

// export const SidebarProvider = ({ children }) => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [isCollapsed, setIsCollapsed] = useState(false);

//   const toggleSidebar = () => {
//     setIsSidebarOpen(!isSidebarOpen);
//   };

//   const toggleCollapse = () => {
//     setIsCollapsed(!isCollapsed);
//   };

//   return (
//     <SidebarContext.Provider value={{ 
//       isSidebarOpen, setIsSidebarOpen,
//       isCollapsed, setIsCollapsed,
//       toggleSidebar, toggleCollapse
//      }}>
//       {children}
//     </SidebarContext.Provider>
//   );
// };

export const SidebarProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        isCollapsed,
        toggleSidebar,
        closeSidebarOnMobile,
        setIsSidebarOpen,
        setIsCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};


export const useSidebar = () => useContext(SidebarContext);