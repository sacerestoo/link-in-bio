import type { ReactElement } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: Readonly<TabsPrimitive.Root.Props>): ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "gap-1 bg-muted",
        line: "justify-start gap-4 border-b border-border bg-transparent",
      },
      size: {
        sm: "text-sm *:data-[slot=tabs-trigger]:h-6 *:data-[slot=tabs-trigger]:px-2 data-[variant=line]:gap-3",
        md: "text-sm *:data-[slot=tabs-trigger]:h-7 *:data-[slot=tabs-trigger]:px-2.5",
        lg: "text-sm *:data-[slot=tabs-trigger]:h-8 *:data-[slot=tabs-trigger]:px-3",
        xl: "text-base *:data-[slot=tabs-trigger]:h-10 *:data-[slot=tabs-trigger]:px-4 *:data-[slot=tabs-trigger]:text-base data-[variant=line]:gap-5",
        "2xl":
          "text-base *:data-[slot=tabs-trigger]:h-12 *:data-[slot=tabs-trigger]:px-5 *:data-[slot=tabs-trigger]:text-base data-[variant=line]:gap-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
    compoundVariants: [
      // Keep the list radius equal to the trigger radius plus its padding.
      {
        variant: "default",
        size: "sm",
        class:
          "rounded-md p-0.5 *:data-[slot=tabs-indicator]:after:rounded-sm *:data-[slot=tabs-trigger]:rounded-sm",
      },
      {
        variant: "default",
        size: "md",
        class:
          "rounded-lg p-1 *:data-[slot=tabs-indicator]:after:rounded-sm *:data-[slot=tabs-trigger]:rounded-sm",
      },
      {
        variant: "default",
        size: "lg",
        class:
          "rounded-xl p-1 *:data-[slot=tabs-indicator]:after:rounded-md *:data-[slot=tabs-trigger]:rounded-md",
      },
      {
        variant: "default",
        size: "xl",
        class:
          "rounded-2xl p-1.5 *:data-[slot=tabs-indicator]:after:rounded-md *:data-[slot=tabs-trigger]:rounded-md",
      },
      {
        variant: "default",
        size: "2xl",
        class:
          "rounded-3xl p-2 *:data-[slot=tabs-indicator]:after:rounded-lg *:data-[slot=tabs-trigger]:rounded-lg",
      },
    ],
  },
);

function TabsList({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: Readonly<
  TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>
>): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      className={cn(tabsListVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className={cn(
          "pointer-events-none absolute top-0 left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) transition-[translate,width,height] duration-200 ease-out motion-reduce:transition-none",
          "after:absolute after:inset-0 after:border-0 after:bg-background after:shadow-default dark:after:border-input dark:after:bg-input/30",
          "group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[variant=line]/tabs-list:after:top-auto group-data-[variant=line]/tabs-list:after:-bottom-px group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:border-0 group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:shadow-none",
          "group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:right-0 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:left-auto group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:h-auto group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:w-0.5",
        )}
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: Readonly<TabsPrimitive.Tab.Props>): ReactElement {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-transparent whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-in-out select-none group-data-[variant=line]/tabs-list:rounded-none group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:bg-transparent hover:text-foreground data-active:text-foreground",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: Readonly<TabsPrimitive.Panel.Props>): ReactElement {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
