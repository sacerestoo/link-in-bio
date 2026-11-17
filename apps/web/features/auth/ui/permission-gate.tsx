import type { ReactNode } from "react";

export const PermissionGate = ({
  allowed,
  children,
}: Readonly<{ allowed: boolean; children: ReactNode }>) => {
  return allowed ? children : null;
};
