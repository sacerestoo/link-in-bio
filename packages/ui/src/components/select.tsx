import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "cn";
import CheckIcon from "lucide-react/icons/check";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import ChevronUpIcon from "lucide-react/icons/chevron-up";
import * as React from "react";

const select = SelectPrimitive.Root;

function SelectGroup({
  className,
  ...props
}: Readonly<SelectPrimitive.Group.Props>): React.ReactElement {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-0", className)}
      {...props}
    />
  );
}

function SelectValue({
  className,
  ...props
}: Readonly<SelectPrimitive.Value.Props>): React.ReactElement {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "lg",
  children,
  ...props
}: Readonly<
  SelectPrimitive.Trigger.Props & {
    size?: "sm" | "md" | "lg" | "xl";
  }
>): React.ReactElement {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group flex h-8 w-full items-center justify-between gap-2 rounded-lg border-0 bg-background py-1.5 ps-2.5 pe-2 text-[13px]/5 whitespace-nowrap text-foreground shadow-default transition-colors outline-none select-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-foreground/6 disabled:text-foreground/25 disabled:shadow-none aria-expanded:bg-muted aria-expanded:text-foreground aria-expanded:ring-1 aria-expanded:ring-brand data-placeholder:text-muted-foreground disabled:data-placeholder:text-foreground/25 data-[size=md]:h-7 data-[size=md]:py-1 data-[size=md]:ps-2 data-[size=md]:pe-1.5 data-[size=sm]:h-6 data-[size=sm]:rounded-md data-[size=sm]:py-1 data-[size=sm]:ps-1.5 data-[size=sm]:pe-1 data-[size=sm]:text-xs data-[size=xl]:h-10 data-[size=xl]:py-2 data-[size=xl]:ps-3 data-[size=xl]:pe-2.5 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-muted/50 dark:aria-invalid:focus-visible:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "aria-invalid:bg-destructive/3 aria-invalid:text-destructive aria-invalid:shadow-none aria-invalid:inset-ring-[0.5px] aria-invalid:inset-ring-destructive/20 aria-invalid:hover:bg-destructive/10 aria-invalid:focus-visible:bg-destructive/10 aria-invalid:focus-visible:ring-destructive/20 aria-invalid:focus-visible:inset-ring-destructive/30 aria-invalid:aria-expanded:bg-destructive/10 aria-invalid:aria-expanded:ring-0 aria-invalid:aria-expanded:inset-ring-destructive/30 aria-invalid:data-placeholder:text-destructive/50 aria-invalid:data-popup-open:bg-destructive/10 aria-invalid:data-popup-open:ring-0 aria-invalid:data-popup-open:inset-ring-destructive/30 dark:aria-invalid:bg-destructive/3 dark:aria-invalid:hover:bg-destructive/10 dark:aria-invalid:focus-visible:bg-destructive/10 dark:aria-invalid:aria-expanded:bg-destructive/10 dark:aria-invalid:data-popup-open:bg-destructive/10 aria-invalid:[&>svg]:text-destructive",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <svg
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180 group-data-popup-open:rotate-180"
            fill="none"
            viewBox="0 0 16 16"
          >
            <path
              clipRule="evenodd"
              d="M8.35356 10.8533C8.1583 11.0485 7.84172 11.0485 7.64645 10.8533L4.00002 7.20682C3.80476 7.01156 3.80476 6.69498 4.00002 6.49972C4.19529 6.30446 4.51187 6.30446 4.70713 6.49972L8.00001 9.79261L11.2929 6.49976C11.4882 6.30449 11.8048 6.30449 12 6.49976C12.1953 6.69502 12.1953 7.0116 12 7.20686L8.35356 10.8533Z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: Readonly<
  SelectPrimitive.Popup.Props &
    Pick<
      SelectPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
    >
>): React.ReactElement {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        positionMethod="fixed"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative flex max-h-[min(24rem,var(--available-height))] min-w-(--anchor-width) origin-(--transform-origin) flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-extra-large transition-[opacity,transform,translate,scale] duration-200 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-[side=left]:data-starting-style:-translate-x-1 data-[side=right]:data-starting-style:translate-x-1",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="min-h-0 scroll-py-1 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: Readonly<SelectPrimitive.GroupLabel.Props>): React.ReactElement {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: Readonly<SelectPrimitive.Item.Props>): React.ReactElement {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm font-semimedium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: Readonly<SelectPrimitive.Separator.Props>): React.ReactElement {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-0.5 h-[0.5px] bg-foreground/6",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: Readonly<
  React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>
>): React.ReactElement {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: Readonly<
  React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>
>): React.ReactElement {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  select as Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
