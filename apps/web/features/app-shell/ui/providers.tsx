"use client";

import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { OverlayProvider } from "overlay-kit";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <OverlayProvider>{children}</OverlayProvider>
    </QueryClientProvider>
  );
}
