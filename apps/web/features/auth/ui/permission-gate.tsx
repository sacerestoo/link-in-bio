"use client";

import { useSuspenseOwnPage } from "@/features/auth/queries";
import { Suspense, type ReactNode } from "react";

export const PermissionGate = ({
  handle,
  hasSession,
  whenAllowed,
  whenDenied,
}: Readonly<{
  handle: string;
  hasSession: boolean;
  whenAllowed?: ReactNode;
  whenDenied?: ReactNode;
}>) => {
  if (!hasSession) return whenDenied;

  return (
    <Suspense fallback={null}>
      <OwnPagePermissionGate
        handle={handle}
        whenAllowed={whenAllowed}
      />
    </Suspense>
  );
};

function OwnPagePermissionGate({
  handle,
  whenAllowed,
}: Readonly<{ handle: string; whenAllowed?: ReactNode }>): ReactNode {
  const ownPage = useSuspenseOwnPage();
  return ownPage.data?.handle === handle ? whenAllowed : null;
}
