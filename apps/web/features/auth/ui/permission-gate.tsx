import type { ReactNode } from "react";

export const PermissionGate = ({
  hasPermission,
  whenAllowed,
  whenDenied,
}: Readonly<{
  hasPermission: boolean;
  whenAllowed?: ReactNode;
  whenDenied?: ReactNode;
}>) => {
  return hasPermission ? whenAllowed : whenDenied;
};
