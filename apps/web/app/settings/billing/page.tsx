import type { Metadata } from "next";
import type { ReactNode } from "react";
import { authQueries } from "@/features/auth/queries";
import { BillingManagement } from "@/features/settings/ui/billing-management";
import { SettingsShell } from "@/features/settings/ui/settings-shell";
import { getWebEnv } from "@/lib/env";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage(): Promise<ReactNode> {
  const requestHeaders = await headers();
  const signInUrl = `/sign-in?redirectTo=${encodeURIComponent("/settings/billing")}`;
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

  const settings = await getWebEnv();

  return (
    <SettingsShell activeTab="billing">
      <BillingManagement
        userId={user.id}
        hasAccessGranted={user.hasAccessGranted}
        subscription={user.subscription}
        monthlyProductId={settings.NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID}
        yearlyProductId={settings.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID}
      />
    </SettingsShell>
  );
}
