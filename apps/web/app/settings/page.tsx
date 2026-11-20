import type { Metadata } from "next";
import type { ReactNode } from "react";
import { authQueries } from "@/features/auth/queries";
import { AccountManagement } from "@/features/settings/ui/account-management";
import { SettingsShell } from "@/features/settings/ui/settings-shell";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings | Grabbin",
};

export default async function SettingsPage(): Promise<ReactNode> {
  const requestHeaders = await headers();
  const signInUrl = `/sign-in?redirectTo=${encodeURIComponent("/settings")}`;
  if (getSessionCookie(requestHeaders) === null) redirect(signInUrl);

  const serverApi = await createServerApiClient(requestHeaders);
  let user: Awaited<ReturnType<typeof authQueries.currentUser>>["user"];
  try {
    user = (await authQueries.currentUser(serverApi)).user;
  } catch (error: unknown) {
    if (error instanceof DetailedError && error.statusCode === 401) {
      redirect(signInUrl);
    }
    throw error;
  }

  return (
    <SettingsShell activeTab="account">
      <SettingsContent user={user} />
    </SettingsShell>
  );
}

function SettingsContent({
  user,
}: Parameters<typeof AccountManagement>[0]): ReactNode {
  return (
    <>
      <header>
        <h1 className="text-base font-medium tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your profile</p>
      </header>
      <AccountManagement user={user} />
    </>
  );
}
