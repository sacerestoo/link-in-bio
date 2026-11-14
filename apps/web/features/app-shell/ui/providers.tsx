"use client";

import { getQueryClient } from "@/lib/query-client";
import { sentryPrivacyOptions } from "@grabbin/shared/observability";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { OverlayProvider } from "overlay-kit";
import { useEffect, type ReactNode } from "react";

function initializeSentry(): void {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    ...sentryPrivacyOptions,
  });
}

export function Providers({ children }: { children: ReactNode }): ReactNode {
  useEffect(initializeSentry, []);
  return (
    <QueryClientProvider client={getQueryClient()}>
      <OverlayProvider>{children}</OverlayProvider>
    </QueryClientProvider>
  );
}
