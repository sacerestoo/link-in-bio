import type { ReactNode } from "react";
import Settings from "lucide-react/icons/settings";
import Wallet from "lucide-react/icons/wallet";
import Link from "next/link";

type SettingsTab = "account" | "billing";

export function SettingsShell({
  activeTab,
  children,
}: Readonly<{ activeTab: SettingsTab; children: ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-4 pb-6 sm:px-6 sm:pt-6">
      <div className="flex w-full flex-col items-start gap-6 md:flex-row md:gap-4">
        <aside className="sticky top-0 flex w-full shrink-0 flex-col gap-2 self-start bg-background md:w-56">
          <nav
            aria-label="Settings navigation"
            className="-mx-4 no-scrollbar flex flex-row flex-nowrap gap-6 overflow-x-auto overflow-y-hidden border-b border-border px-4 pt-4 text-base font-medium whitespace-nowrap text-[#999999] md:mx-0 md:flex-col md:gap-2 md:overflow-visible md:border-b-0 md:px-0 md:pt-2 md:text-sm md:whitespace-normal"
          >
            <SettingsLink
              href="/settings"
              active={activeTab === "account"}
              icon={
                <Settings
                  className="size-4"
                  aria-hidden="true"
                />
              }
            >
              Account
            </SettingsLink>
            <SettingsLink
              href="/settings/billing"
              active={activeTab === "billing"}
              icon={
                <Wallet
                  className="size-4"
                  aria-hidden="true"
                />
              }
            >
              Billing
            </SettingsLink>
          </nav>
        </aside>
        <section className="flex w-full min-w-0 flex-col gap-6 md:mt-1.5 md:flex-1">
          {children}
        </section>
      </div>
    </main>
  );
}

function SettingsLink({
  href,
  active,
  icon,
  children,
}: Readonly<{
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "-mb-px flex shrink-0 flex-row items-center gap-2 border-b-3 border-primary pb-4 text-primary md:mb-0 md:border-b-0 md:pb-0"
          : "-mb-px flex shrink-0 flex-row items-center gap-2 border-b-3 border-transparent pb-4 hover:text-foreground md:mb-0 md:border-b-0 md:pb-0"
      }
    >
      {icon}
      {children}
    </Link>
  );
}
