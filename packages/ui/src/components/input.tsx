import type { ReactElement } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

const inputVariants = cva(
  "w-full min-w-0 rounded-lg bg-transparent px-2.5 py-1 caret-foreground shadow-default transition-[color,border-color,box-shadow] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground not-focus-visible:hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:hover:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "",
        flat: "bg-muted shadow-none not-focus-visible:hover:bg-muted focus-visible:hover:bg-muted dark:bg-muted",
        ghost:
          "shadow-none hover:bg-transparent not-focus-visible:hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:hover:bg-transparent",
      },
      size: {
        default: "h-8 text-base md:text-sm",
        sm: "h-7 text-sm",
        lg: "h-9 text-base",
        xl: "h-10 text-base",
        "2xl": "h-12 text-lg",
      },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

function Input({
  className,
  type,
  size = "default",
  variant = "default",
  ...props
}: Readonly<
  Omit<React.ComponentProps<"input">, "size"> &
    VariantProps<typeof inputVariants>
>): ReactElement {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export { Input };
export default Input;
