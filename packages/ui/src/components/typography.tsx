import { cn } from "@grabbin/ui/lib/utils";
import { createElement, type ComponentProps, type ReactElement } from "react";

type TypographyWeight = "regular" | "semimedium" | "medium" | "semibold";
type HeadingSize = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type TextSize = "lg" | "base" | "sm";
type CaptionSize = TextSize | "xs";

type HeadingProps = ComponentProps<"h1"> & {
  as: HeadingTag;
  size: HeadingSize;
  weight?: TypographyWeight;
};
type TextProps = ComponentProps<"p"> & {
  size?: TextSize;
  weight?: TypographyWeight;
};
type CaptionProps = ComponentProps<"p"> & {
  size?: CaptionSize;
  weight?: TypographyWeight;
  uppercase?: boolean;
};

const weightClasses: Record<TypographyWeight, string> = {
  regular: "font-normal",
  semimedium: "font-semimedium",
  medium: "font-medium",
  semibold: "font-semibold",
};

const headingSizeClasses: Record<HeadingSize, string> = {
  1: "text-[length:3.5rem] leading-[3.5rem] tracking-[-0.01em]",
  2: "text-[length:2.75rem] leading-[3.5rem] tracking-[-0.01em]",
  3: "text-[length:2.25rem] leading-[2.75rem] tracking-[-0.01em]",
  4: "text-[length:1.75rem] leading-[2.25rem] tracking-[-0.01em]",
  5: "text-[length:1.5rem] leading-[2rem] tracking-[-0.01em]",
  6: "text-[length:1.25rem] leading-[1.5rem] tracking-[-0.01em]",
};

const textSizeClasses: Record<TextSize, string> = {
  lg: "text-lg leading-6",
  base: "text-[length:0.9375rem] leading-6",
  sm: "text-[length:0.8125rem] leading-5",
};

const captionSizeClasses: Record<CaptionSize, string> = {
  lg: "text-xs leading-4",
  base: "text-[length:0.6875rem] leading-4",
  sm: "text-[length:0.625rem] leading-4",
  xs: "text-[length:0.5rem] leading-3",
};

const fontClasses = "font-sans [font-feature-settings:'ss03']";

export function Heading({
  as,
  size,
  weight = "medium",
  className,
  ...props
}: Readonly<HeadingProps>): ReactElement {
  const tagName = as;

  return (
    <>
      {createElement(tagName, {
        className: cn(
          fontClasses,
          "text-pretty text-foreground",
          headingSizeClasses[size],
          weightClasses[weight],
          className,
        ),
        ...props,
      })}
    </>
  );
}

export function Text({
  size = "base",
  weight = "regular",
  className,
  ...props
}: Readonly<TextProps>): ReactElement {
  return (
    <p
      className={cn(
        fontClasses,
        textSizeClasses[size],
        weightClasses[weight],
        className,
      )}
      {...props}
    />
  );
}

export function Caption({
  size = "base",
  weight = "regular",
  uppercase = false,
  className,
  ...props
}: Readonly<CaptionProps>): ReactElement {
  return (
    <p
      className={cn(
        fontClasses,
        captionSizeClasses[size],
        weightClasses[weight],
        uppercase ? "tracking-wider uppercase" : undefined,
        className,
      )}
      {...props}
    />
  );
}
