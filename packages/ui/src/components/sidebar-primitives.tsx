import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import { Separator } from "@grabbin/ui/components/separator";
import { cn } from "cn";
import * as React from "react";
import { AnglesLeft2 } from "reicon-react/icons/AnglesLeft2";
import { AnglesRight2 } from "reicon-react/icons/AnglesRight2";
import { useSidebar } from "./sidebar-context";

function SidebarTrigger({
  className,
  iconClassName,
  mobile = false,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & {
  iconClassName?: string;
  mobile?: boolean;
}): React.ReactElement {
  const { onToggleSidebar, onOpenMobileChange, state, isMobile, openMobile } =
    useSidebar();
  const isOpen = mobile || isMobile ? openMobile : state === "expanded";
  const handleClick: NonNullable<
    React.ComponentProps<typeof Button>["onClick"]
  > = (event): void => {
    onClick?.(event);
    if (mobile) {
      onOpenMobileChange((currentOpen): boolean => !currentOpen);
      return;
    }
    onToggleSidebar();
  };

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={handleClick}
      {...props}
    >
      {isOpen ? (
        <AnglesLeft2
          weight="Filled"
          className={iconClassName}
        />
      ) : (
        <AnglesRight2
          weight="Filled"
          className={iconClassName}
        />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({
  className,
  ...props
}: Readonly<React.ComponentProps<"button">>): React.ReactElement {
  const { onToggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={onToggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({
  className,
  ...props
}: Readonly<React.ComponentProps<"main">>): React.ReactElement {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>): React.ReactElement {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("h-8 w-full bg-background shadow-none", className)}
      {...props}
    />
  );
}

function SidebarHeader({
  className,
  ...props
}: Readonly<React.ComponentProps<"div">>): React.ReactElement {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({
  className,
  ...props
}: Readonly<React.ComponentProps<"div">>): React.ReactElement {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>): React.ReactElement {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
}

function SidebarContent({
  className,
  ...props
}: Readonly<React.ComponentProps<"div">>): React.ReactElement {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarInput,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
};
