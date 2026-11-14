"use client";

import { Button } from "@grabbin/ui/components/button";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center px-6 py-16 text-center">
      <section>
        <h1 className="text-6xl font-semibold">500</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Something went wrong. Please try again.
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          onClick={reset}
        >
          Try again
        </Button>
      </section>
    </main>
  );
}
