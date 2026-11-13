import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@grabbin/ui/components/sheet";
import * as React from "react";

type SidebarStyle = React.CSSProperties & { "--sidebar-width"?: string };

type SidebarMobileProps = Readonly<{
  attributes: React.ComponentProps<"div">;
  children: React.ReactNode;
  dir: React.ComponentProps<"div">["dir"];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  side: "left" | "right";
}>;

export default function SidebarMobile({
  attributes,
  children,
  dir,
  onOpenChange,
  open,
  side,
}: SidebarMobileProps): React.ReactElement {
  const mobileStyle: SidebarStyle = { "--sidebar-width": "18rem" };
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      {...attributes}
    >
      <SheetContent
        dir={dir}
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        className="w-(--sidebar-width) bg-background p-0 text-sidebar-foreground [&>button]:hidden"
        style={mobileStyle}
        side={side}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Displays the mobile sidebar.</SheetDescription>
        </SheetHeader>
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
