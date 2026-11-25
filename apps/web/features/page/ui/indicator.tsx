"use client";

import type { Handle } from "@grabbin/shared/schemas/page";
import type { ReactElement } from "react";
import Loading from "@grabbin/ui/components/loading";
import { useIsMutating } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { pageQueries } from "../queries";

export default function Indicator(): ReactElement | null {
  const { handle } = useParams<{ handle: Handle }>();
  const isSaving =
    useIsMutating({
      mutationKey: pageQueries.byHandle(handle),
    }) > 0;

  if (!isSaving) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground"
    >
      <Loading
        aria-hidden="true"
        className="size-4"
      />
      <span>Saving</span>
    </p>
  );
}
