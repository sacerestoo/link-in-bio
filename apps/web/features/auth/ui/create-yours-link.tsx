import type { ReactElement } from "react";
import { Button } from "@grabbin/ui/components/button";
import Link from "next/link";

export default function CreateYoursLink(): ReactElement {
  return (
    <Button
      nativeButton={false}
      variant="outline"
      size="2xl"
      className="rounded-full px-5 text-base page-wide:rounded-full page-wide:px-5 page-wide:text-base"
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
