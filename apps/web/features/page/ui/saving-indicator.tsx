"use client";

import type { Handle } from "@grabbin/shared/schemas/page";
import type { ReactElement } from "react";
import Loading from "@grabbin/ui/components/loading";
import { useIsMutating, useMutationState } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { pageMutationKeys } from "../mutations";

export default function SavingIndicator(): ReactElement | null {
  const { handle } = useParams<{ handle: Handle }>();
  const mutationKey = pageMutationKeys.savePage(handle);
  const saveStates = useMutationState({
    filters: { mutationKey, exact: true },
    select: (mutation) => ({
      status: mutation.state.status,
      error: mutation.state.error,
      submittedAt: mutation.state.submittedAt,
    }),
  });
  const latestSave = saveStates.toSorted(
    (first, second) => second.submittedAt - first.submittedAt,
  )[0];
  const errorMessage =
    latestSave?.status === "error"
      ? latestSave.error instanceof Error && latestSave.error.message.length > 0
        ? latestSave.error.message
        : "Please try again."
      : null;
  const isSaving =
    useIsMutating({
      mutationKey,
      exact: true,
    }) > 0;

  if (errorMessage !== null)
    return (
      <p
        role="alert"
        className="px-2 text-sm font-medium text-destructive"
      >
        {errorMessage}
      </p>
    );

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
