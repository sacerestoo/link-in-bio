import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";
import * as React from "react";

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props &
  Pick<ScrollAreaPrimitive.Scrollbar.Props, "orientation"> & {
    showScrollbar?: boolean;
  };

function ScrollArea({
  className,
  children,
  orientation = "vertical",
  showScrollbar = true,
  ...props
}: Readonly<ScrollAreaProps>): React.ReactElement {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        data-orientation={orientation}
        className={cn(
          "base-ui-disable-scrollbar relative size-full transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[orientation=horizontal]:pb-2.5 data-[orientation=vertical]:pe-2.5",
          orientation === "vertical" ? "scroll-fade-y" : "scroll-fade-x",
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {showScrollbar && (
        <>
          <ScrollBar orientation={orientation} />
          <ScrollAreaPrimitive.Corner />
        </>
      )}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: Readonly<ScrollAreaPrimitive.Scrollbar.Props>): React.ReactElement {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "z-10 m-1.5 flex touch-none rounded-full bg-foreground/[0.06] opacity-0 transition-opacity select-none before:absolute before:h-full before:w-5 before:content-[''] data-[hovering]:pointer-events-auto data-[hovering]:opacity-100 data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:items-center data-[orientation=horizontal]:before:h-5 data-[orientation=horizontal]:before:w-full data-[orientation=vertical]:w-1 data-[orientation=vertical]:justify-center data-[scrolling]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-[inherit] bg-foreground/[0.09]",
          orientation === "vertical" ? "w-full" : "h-full",
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
