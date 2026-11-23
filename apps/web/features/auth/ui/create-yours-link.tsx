import type { ComponentProps, ReactElement } from "react";
import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import Link from "next/link";

type CreateYoursLinkProps = Pick<
  ComponentProps<typeof Button>,
  "size" | "variant"
> & {
  className?: string;
};

export default function CreateYoursLink({
  className,
  size = "2xl",
  variant = "outline",
}: CreateYoursLinkProps): ReactElement {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      render={
        <Link
          href="/sign-in"
          prefetch={false}
        />
      }
    >
      Create yours
    </Button>
  );
}
