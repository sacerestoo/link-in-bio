import type { ComponentProps, ReactElement } from "react";
import { cn } from "@grabbin/ui/lib/utils";

function Label({
  className,
  htmlFor,
  ...props
}: Readonly<ComponentProps<"label">>): ReactElement {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
