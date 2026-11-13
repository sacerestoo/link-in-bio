import type { ReactElement } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

const textareaVariants = cva(
  "flex field-sizing-content w-full rounded-lg bg-transparent shadow-default transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive/20 aria-invalid:bg-destructive/3 aria-invalid:text-destructive aria-invalid:shadow-none aria-invalid:ring aria-invalid:ring-destructive aria-invalid:placeholder:text-destructive/50 aria-invalid:focus-visible:ring dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:bg-destructive/3 dark:aria-invalid:ring-destructive",
  {
    variants: {
      size: {
        sm: "min-h-12 px-2 py-1.5 text-sm",
        md: "min-h-16 px-2.5 py-2 text-base md:text-sm",
        lg: "min-h-20 px-3 py-2.5 text-base",
        xl: "min-h-24 px-3.5 py-3 text-lg",
      },
      variant: {
        default: "",
        ghost:
          "shadow-none focus-visible:border-transparent focus-visible:ring-0",
      },
    },
    defaultVariants: { size: "md", variant: "default" },
  },
);

function Textarea({
  className,
  size = "md",
  variant = "default",
  ...props
}: Readonly<
  React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>
>): ReactElement {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export { Textarea };
