import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/queries";
import { AccountManagement } from "@/features/settings/ui/account-management";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
import Settings from "lucide-react/icons/settings";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings | Grabbin",
};

const getSettingsUser = async (
  api: Awaited<ReturnType<typeof createServerApiClient>>,
) => {
  try {
    return (await getCurrentUser(api)).user;
  } catch (error: unknown) {
    if (!(error instanceof DetailedError && error.statusCode === 401)) {
      throw error;
    }
    return redirect("/sign-in?redirectTo=%2Fsettings");
  }
};

export default async function SettingsPage(): Promise<ReactNode> {
  const requestHeaders = await headers();
  if (getSessionCookie(requestHeaders) === null)
    redirect("/sign-in?redirectTo=%2Fsettings");
  const api = await createServerApiClient(requestHeaders);
  const user = await getSettingsUser(api);
  return <SettingsContent user={user} />;
}

function SettingsContent({
  user,
}: Parameters<typeof AccountManagement>[0]): ReactNode {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-4 pb-6 sm:px-6 sm:pt-6">
      <div className="flex w-full flex-col items-start gap-6 md:flex-row md:gap-4">
        <aside className="sticky top-0 flex w-full shrink-0 flex-col gap-2 self-start bg-background md:w-56">
          <nav
            aria-label="Settings navigation"
            className="-mx-4 no-scrollbar flex flex-row flex-nowrap gap-6 overflow-x-auto overflow-y-hidden border-b border-border px-4 pt-4 text-base font-medium whitespace-nowrap text-[#999999] md:mx-0 md:flex-col md:gap-2 md:overflow-visible md:border-b-0 md:px-0 md:pt-2 md:text-sm md:whitespace-normal"
          >
            <Link
              href="/settings"
              aria-current="page"
              className="-mb-px flex shrink-0 flex-row items-center gap-2 border-b-3 border-primary pb-4 text-primary md:mb-0 md:border-b-0 md:pb-0"
            >
              <Settings
                className="size-4"
                aria-hidden="true"
              />
              Account
            </Link>
          </nav>
        </aside>
        <section className="flex w-full min-w-0 flex-col gap-6 md:mt-1.5 md:flex-1">
          <header>
            <h1 className="text-base font-medium tracking-tight">Account</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile.
            </p>
          </header>
          <AccountManagement user={user} />
        </section>
      </div>
    </main>
  );
}
