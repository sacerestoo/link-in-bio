"use client";

import type { ReactElement } from "react";
import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import { Textarea } from "@grabbin/ui/components/textarea";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 items-center overflow-hidden rounded-lg shadow-default transition-[color,border-color,box-shadow] outline-none hover:bg-muted/50 in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[[data-slot=input-group-control]:disabled]:bg-input/50 has-[[data-slot=input-group-control]:disabled]:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-0 has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-brand has-[[data-slot=input-group-control]:focus-visible]:hover:bg-transparent has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-2 has-[[data-slot][aria-invalid=true]]:ring-destructive/60 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=inline-end]]:pr-1.5 has-[>[data-align=inline-start]]:pl-1.5 has-[>textarea]:h-auto dark:bg-input/30 dark:has-[[data-slot=input-group-control]:disabled]:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3",
  {
    variants: {
      variant: {
        default: "",
        flat: "bg-muted shadow-none hover:bg-muted has-[[data-slot=input-group-control]:focus-visible]:hover:bg-muted dark:bg-muted",
      },
      size: {
        default: "h-8",
        sm: "h-7",
        lg: "h-9",
        xl: "h-10",
        "2xl": "h-12",
      },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

type InputGroupSize = NonNullable<
  VariantProps<typeof inputGroupVariants>["size"]
>;
const inputGroupSizeContext = React.createContext<InputGroupSize>("default");

function InputGroup({
  className,
  size = "default",
  variant = "default",
  ...props
}: Readonly<
  React.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>
>): ReactElement {
  const groupSize = size ?? "default";
  return (
    <inputGroupSizeContext.Provider value={groupSize}>
      <div
        data-slot="input-group"
        role="group"
        className={cn(
          inputGroupVariants({ size: groupSize, variant }),
          className,
        )}
        {...props}
      />
    </inputGroupSizeContext.Provider>
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: Readonly<
  React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>
>): ReactElement {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-7",
      "icon-xs": "size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0",
      "icon-sm": "size-7 p-0 has-[>svg]:p-0",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Readonly<
  Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
    VariantProps<typeof inputGroupButtonVariants> & {
      type?: "button" | "submit" | "reset";
    }
>): ReactElement {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({
  className,
  ...props
}: Readonly<React.ComponentProps<"span">>): ReactElement {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: Readonly<Omit<React.ComponentProps<"input">, "size">>): ReactElement {
  const size = React.useContext(inputGroupSizeContext);

  return (
    <Input
      size={size}
      data-slot="input-group-control"
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent text-sm shadow-none ring-0 hover:bg-transparent focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: Readonly<React.ComponentProps<"textarea">>): ReactElement {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
