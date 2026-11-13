import { cn } from "cn";
import * as React from "react";

type SidebarDesktopProps = Readonly<{
  attributes: React.ComponentProps<"div">;
  children: React.ReactNode;
  className: string | undefined;
  collapsible: "offcanvas" | "icon" | "none";
  side: "left" | "right";
  state: "expanded" | "collapsed";
  variant: "sidebar" | "floating" | "inset";
}>;

const sidebarGapWidthClassName = (
  variant: SidebarDesktopProps["variant"],
): string =>
  variant === "floating" || variant === "inset"
    ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
    : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)";

export default function SidebarDesktop({
  attributes,
  children,
  className,
  collapsible,
  side,
  state,
  variant,
}: SidebarDesktopProps): React.ReactElement {
  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          sidebarGapWidthClassName(variant),
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        {...attributes}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col bg-background group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
