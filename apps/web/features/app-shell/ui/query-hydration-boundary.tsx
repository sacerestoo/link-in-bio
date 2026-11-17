"use client";

import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";
import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";

export function QueryHydrationBoundary({
  state,
  children,
}: Readonly<{ state: DehydratedState; children: ReactNode }>): ReactNode {
  // vinext route client boundaries don't inherit the root provider context.
  return (
    <QueryClientProvider client={getQueryClient()}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
