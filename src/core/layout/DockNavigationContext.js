import { createContext, useContext } from "react";

const DockNavigationContext = createContext({
  activeTile: "home",
  openTile: () => {},
});

export function DockNavigationProvider({ value, children }) {
  return (
    <DockNavigationContext.Provider value={value}>
      {children}
    </DockNavigationContext.Provider>
  );
}

export function useDockNavigation() {
  return useContext(DockNavigationContext);
}
