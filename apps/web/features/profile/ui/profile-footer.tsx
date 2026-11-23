import { PermissionGate } from "@/features/auth/ui/permission-gate";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MyPageLink } from "./my-page-link";
import { ProfileActions } from "./profile-actions";

const ProfileSaveIndicator = dynamic(() =>
  import("@/features/profile/ui/indicator").then(
    ({ default: IndicatorComponent }) => IndicatorComponent,
  ),
);

interface ProfileFooterProps {
  hasSession: boolean;
  isOwner: boolean;
}

export default function ProfileFooter({
  hasSession,
  isOwner,
}: ProfileFooterProps) {
  return (
    <aside className="w-full shrink-0 bg-secondary page-wide:fixed page-wide:inset-x-0 page-wide:bottom-8 page-wide:z-40 page-wide:bg-transparent">
      <div className="mx-auto flex h-17 w-full max-w-107 shrink-0 items-center justify-center gap-2 p-6 page-wide:h-9.5 page-wide:max-w-none page-wide:justify-start page-wide:p-0 page-wide:px-8">
        <PermissionGate
          allowed={isOwner}
          whenAllowed={<ProfileActions />}
          whenDenied={<MyPageLink hasSessionCookie={hasSession} />}
        />
        <Link
          href="/"
          className="px-2 text-sm font-medium text-muted-foreground hover:text-primary"
          prefetch={false}
        >
          Home
        </Link>
        <PermissionGate
          allowed={isOwner}
          whenAllowed={<ProfileSaveIndicator />}
        />
      </div>
    </aside>
  );
}
