"use client";

import type { ReactElement } from "react";
import Loading from "@grabbin/ui/components/loading";
import { useIsMutating } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { profileQueries } from "../queries";

export default function Indicator(): ReactElement | null {
  const { handle } = useParams<{ handle: string }>();
  const { mutationKey } = profileQueries.updateProfile(handle);
  const isSaving = useIsMutating({ mutationKey }) > 0;

  if (!isSaving) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Loading
        aria-hidden="true"
        className="size-4"
      />
      <span>Saving</span>
    </p>
  );
}
