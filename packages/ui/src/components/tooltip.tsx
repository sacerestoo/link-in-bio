import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

function TooltipProvider({
  delay = 250,
  closeDelay = 0,
  timeout = 400,
  ...props
}: Readonly<TooltipPrimitive.Provider.Props>): React.ReactElement {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      closeDelay={closeDelay}
      timeout={timeout}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: Readonly<TooltipPrimitive.Root.Props>): React.ReactElement {
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      {...props}
    />
  );
}

function TooltipTrigger({
  ...props
}: Readonly<TooltipPrimitive.Trigger.Props>): React.ReactElement {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: Readonly<
  TooltipPrimitive.Popup.Props &
    Pick<
      TooltipPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>): React.ReactElement {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground shadow-default transition-[opacity,transform,translate,scale] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-instant:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=inline-end]:data-starting-style:-translate-x-1 data-[side=inline-start]:data-starting-style:translate-x-1 data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1 data-[side=top]:data-starting-style:translate-y-1",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
