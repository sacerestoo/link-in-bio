import type { ReactElement } from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "cn";

export const separatorOptions = {
  sizes: [
    { value: "a", label: "A · 0.5px" },
    { value: "b", label: "B · 1px" },
    { value: "c", label: "C · 1.2px" },
    { value: "d", label: "D · 1.5px" },
    { value: "e", label: "E · 2px" },
  ],
  colors: [
    { value: "default", label: "Default" },
    { value: "subtle", label: "Subtle" },
    { value: "strong", label: "Strong" },
  ],
  paddings: [
    { value: "none", label: "None · 0px" },
    { value: "xs", label: "Extra small · 2px" },
    { value: "sm", label: "Small · 4px" },
    { value: "md", label: "Medium · 6px" },
    { value: "lg", label: "Large · 8px" },
  ],
} as const;

type SeparatorSize = (typeof separatorOptions.sizes)[number]["value"];
type SeparatorTone = (typeof separatorOptions.colors)[number]["value"];
type SeparatorPadding = (typeof separatorOptions.paddings)[number]["value"];

const sizeClasses: Record<SeparatorSize, string> = {
  a: "data-horizontal:h-[0.5px] data-vertical:w-[0.5px]",
  b: "data-horizontal:h-px data-vertical:w-px",
  c: "data-horizontal:h-[1.2px] data-vertical:w-[1.2px]",
  d: "data-horizontal:h-[1.5px] data-vertical:w-[1.5px]",
  e: "data-horizontal:h-[2px] data-vertical:w-[2px]",
};

const toneClasses: Record<SeparatorTone, string> = {
  default: "bg-black/[6.3%] dark:bg-white/[7.1%]",
  subtle: "bg-black/[2.4%] dark:bg-white/[3.4%]",
  strong: "bg-black/[15.3%] dark:bg-white/[17.2%]",
};

const paddingClasses: Record<SeparatorPadding, string> = {
  none: "data-horizontal:py-0 data-vertical:px-0",
  xs: "data-horizontal:py-0.5 data-vertical:px-0.5",
  sm: "data-horizontal:py-1 data-vertical:px-1",
  md: "data-horizontal:py-1.5 data-vertical:px-1.5",
  lg: "data-horizontal:py-2 data-vertical:px-2",
};

type SeparatorProps = Readonly<
  SeparatorPrimitive.Props & {
    size?: SeparatorSize;
    tone?: SeparatorTone;
    padding?: SeparatorPadding;
  }
>;

function Separator({
  className,
  orientation = "horizontal",
  size = "b",
  tone = "default",
  padding = "none",
  ...props
}: SeparatorProps): ReactElement {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "box-content shrink-0 bg-clip-content data-horizontal:w-full data-vertical:self-stretch",
        sizeClasses[size],
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
