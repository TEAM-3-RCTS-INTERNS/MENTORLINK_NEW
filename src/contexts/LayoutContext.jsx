import React, { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext();

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

export const LayoutProvider = ({ children }) => {
  // Initialize from localStorage or default to expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [filterCollapsed, setFilterCollapsed] = useState(() => {
    const saved = localStorage.getItem('filterCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('filterCollapsed', JSON.stringify(filterCollapsed));
  }, [filterCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  const toggleFilter = () => setFilterCollapsed(prev => !prev);

  // Build layout class string for pages to use
  const getLayoutClass = (baseClass = 'home-layout') => {
    let className = baseClass;
    if (sidebarCollapsed) className += ' sidebar-collapsed';
    if (filterCollapsed) className += ' filter-collapsed';
    return className;
  };

  return (
    <LayoutContext.Provider value={{
      sidebarCollapsed,
      setSidebarCollapsed,
      filterCollapsed,
      setFilterCollapsed,
      toggleSidebar,
      toggleFilter,
      getLayoutClass,
    }}>
      {children}
    </LayoutContext.Provider>
  );
};

export default LayoutContext;
