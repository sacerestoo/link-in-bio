import * as React from "react";

export type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  onOpenChange: (open: boolean | ((open: boolean) => boolean)) => void;
  openMobile: boolean;
  onOpenMobileChange: (open: boolean | ((open: boolean) => boolean)) => void;
  isMobile: boolean;
  onToggleSidebar: () => void;
};

export const sidebarContext = React.createContext<SidebarContextProps | null>(
  null,
);

export const useSidebar = (): SidebarContextProps => {
  const context = React.useContext(sidebarContext);
  if (context === null) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
};
