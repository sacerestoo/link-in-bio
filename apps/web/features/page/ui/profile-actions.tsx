"use client";

import type { ReactElement } from "react";
import { ProfileMenu } from "./profile-menu";

export function ProfileActions(): ReactElement {
  return (
    <div className="flex flex-row items-center gap-1">
      <ProfileMenu />
    </div>
  );
}
