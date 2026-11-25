import type { ReactNode } from "react";

export const PermissionGate = ({
  allowed,
  denied,
  whenAllowed,
  whenDenied,
}: Readonly<{
  allowed: boolean;
  denied?: boolean;
  whenAllowed?: ReactNode;
  whenDenied?: ReactNode;
}>): ReactNode => {
  if (allowed) return whenAllowed;
  if (denied !== false) return whenDenied;
  return null;
};
