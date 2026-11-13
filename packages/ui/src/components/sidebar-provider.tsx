"use client";

import { useIsMobile } from "@grabbin/ui/hooks/use-mobile";
import { cn } from "cn";
import * as React from "react";
import {
  sidebarContext,
  useSidebar,
  type SidebarContextProps,
} from "./sidebar-context";
import SidebarDesktop from "./sidebar-desktop";
import SidebarMobile from "./sidebar-mobile";

const sidebarCookieName = "sidebar_state";
const sidebarCookieMaxAge = 60 * 60 * 24 * 7;
const sidebarWidth = "16rem";
const sidebarWidthIcon = "3rem";
const sidebarKeyboardShortcut = "b";

type SidebarStyle = React.CSSProperties & {
  "--sidebar-width"?: string;
  "--sidebar-width-icon"?: string;
  "--sidebar-width-mobile"?: string;
  "--skeleton-width"?: string;
};

type SidebarOpenState = Pick<
  SidebarContextProps,
  "open" | "openMobile" | "onOpenChange" | "onOpenMobileChange"
>;

function SidebarProviderFrame({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  const wrapperStyle: SidebarStyle = {
    "--sidebar-width": sidebarWidth,
    "--sidebar-width-icon": sidebarWidthIcon,
    ...style,
  };
  return (
    <div
      data-slot="sidebar-wrapper"
      style={wrapperStyle}
      className={cn(
        "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const useSidebarContextValue = (
  state: SidebarContextProps["state"],
  open: boolean,
  onOpenChange: SidebarContextProps["onOpenChange"],
  isMobile: boolean,
  openMobile: boolean,
  onOpenMobileChange: SidebarContextProps["onOpenMobileChange"],
  onToggleSidebar: SidebarContextProps["onToggleSidebar"],
): SidebarContextProps =>
  React.useMemo<SidebarContextProps>(
    (): SidebarContextProps => ({
      state,
      open,
      onOpenChange,
      isMobile,
      openMobile,
      onOpenMobileChange,
      onToggleSidebar,
    }),
    [
      state,
      open,
      onOpenChange,
      isMobile,
      openMobile,
      onOpenMobileChange,
      onToggleSidebar,
    ],
  );

const useSidebarOpenState = (
  defaultOpen: boolean,
  openProp: boolean | undefined,
  onOpenChangeProp: ((open: boolean) => void) | undefined,
): SidebarOpenState => {
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const onOpenChange = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)): void => {
      const openState = typeof value === "function" ? value(open) : value;
      if (onOpenChangeProp !== undefined) onOpenChangeProp(openState);
      if (onOpenChangeProp === undefined) setInternalOpen(openState);
      document.cookie = `${sidebarCookieName}=${openState}; path=/; max-age=${sidebarCookieMaxAge}`;
    },
    [onOpenChangeProp, open],
  );

  return { open, openMobile, onOpenChange, onOpenMobileChange: setOpenMobile };
};

const useSidebarToggle = (
  isMobile: boolean,
  onOpenChange: SidebarContextProps["onOpenChange"],
  onOpenMobileChange: SidebarContextProps["onOpenMobileChange"],
): SidebarContextProps["onToggleSidebar"] =>
  React.useCallback((): void => {
    if (isMobile) {
      onOpenMobileChange((isOpen): boolean => !isOpen);
      return;
    }
    onOpenChange((isOpen): boolean => !isOpen);
  }, [isMobile, onOpenChange, onOpenMobileChange]);

const useSidebarKeyboardShortcut = (
  onToggleSidebar: SidebarContextProps["onToggleSidebar"],
): void => {
  React.useEffect((): (() => void) => {
    const handleKeyDown = (event: Readonly<KeyboardEvent>): void => {
      if (
        event.key === sidebarKeyboardShortcut &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        onToggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleSidebar]);
};

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: Readonly<
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>): React.ReactElement {
  const isMobile = useIsMobile();
  const { open, openMobile, onOpenChange, onOpenMobileChange } =
    useSidebarOpenState(defaultOpen, openProp, setOpenProp);
  const onToggleSidebar = useSidebarToggle(
    isMobile,
    onOpenChange,
    onOpenMobileChange,
  );
  useSidebarKeyboardShortcut(onToggleSidebar);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";
  const contextValue = useSidebarContextValue(
    state,
    open,
    onOpenChange,
    isMobile,
    openMobile,
    onOpenMobileChange,
    onToggleSidebar,
  );

  return (
    <sidebarContext.Provider value={contextValue}>
      <SidebarProviderFrame
        className={className}
        style={style}
        {...props}
      >
        {children}
      </SidebarProviderFrame>
    </sidebarContext.Provider>
  );
}

type SidebarProps = Readonly<
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>;

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: SidebarProps): React.ReactElement {
  const { isMobile, state, openMobile, onOpenMobileChange } = useSidebar();
  if (isMobile) {
    return (
      <SidebarMobile
        attributes={props}
        dir={dir}
        onOpenChange={onOpenMobileChange}
        open={openMobile}
        side={side}
      >
        {children}
      </SidebarMobile>
    );
  }
  if (collapsible === "none") {
    return (
      <SidebarDesktop
        attributes={props}
        className={className}
        collapsible="none"
        side={side}
        state="expanded"
        variant={variant}
      >
        {children}
      </SidebarDesktop>
    );
  }
  return (
    <SidebarDesktop
      attributes={props}
      className={className}
      collapsible={collapsible}
      side={side}
      state={state}
      variant={variant}
    >
      {children}
    </SidebarDesktop>
  );
}

export { Sidebar, SidebarProvider };
