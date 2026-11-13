import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "cn";
import CheckIcon from "lucide-react/icons/check";
import ChevronRightIcon from "lucide-react/icons/chevron-right";
import * as React from "react";

function DropdownMenu(
  props: Readonly<MenuPrimitive.Root.Props>,
): React.ReactElement {
  return (
    <MenuPrimitive.Root
      data-slot="dropdown-menu"
      {...props}
    />
  );
}

function DropdownMenuTrigger(
  props: Readonly<MenuPrimitive.Trigger.Props>,
): React.ReactElement {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuSubmenuRoot(
  props: Readonly<MenuPrimitive.SubmenuRoot.Props>,
): React.ReactElement {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

type DropdownMenuSubmenuTriggerProps = Readonly<
  MenuPrimitive.SubmenuTrigger.Props & { chevronStrokeWidth?: number }
>;

function DropdownMenuSubmenuTrigger({
  className,
  children,
  chevronStrokeWidth = 2,
  ...props
}: DropdownMenuSubmenuTriggerProps): React.ReactElement {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-submenu-trigger"
      className={cn(
        "group/dropdown-menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md ps-1.5 pe-2 text-[13px] leading-5 outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 font-medium">{children}</span>
      <ChevronRightIcon
        className="size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={chevronStrokeWidth}
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubmenuContent({
  className,
  ...props
}: Readonly<MenuPrimitive.Popup.Props>): React.ReactElement {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align="start"
        side="inline-end"
        sideOffset={-4}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-submenu-content"
          className={cn(
            "z-50 max-h-(--available-height) w-36 min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-1 text-sm text-popover-foreground shadow-default duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-foreground/7 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: Readonly<
  MenuPrimitive.Popup.Props &
    Pick<
      MenuPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>): React.ReactElement {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 max-h-(--available-height) w-auto min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-0 text-popover-foreground shadow-default duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-foreground/7 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: Readonly<MenuPrimitive.Item.Props>): React.ReactElement {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "group/dropdown-menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md ps-1.5 pe-2 text-sm leading-5 outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Readonly<MenuPrimitive.CheckboxItem.Props>): React.ReactElement {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "group/dropdown-menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md ps-1.5 pe-2 text-sm leading-5 outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 font-medium">{children}</span>
      <MenuPrimitive.CheckboxItemIndicator>
        <CheckIcon
          className="size-3.5 text-brand-green"
          strokeWidth={2.5}
        />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: Readonly<MenuPrimitive.Separator.Props>): React.ReactElement {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("h-[0.5px] bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubmenuContent,
  DropdownMenuSubmenuRoot,
  DropdownMenuSubmenuTrigger,
  DropdownMenuTrigger,
};
