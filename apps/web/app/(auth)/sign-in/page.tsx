import type { Metadata } from "next";
import type { ReactNode } from "react";
import SocialAuthForm from "@/features/auth/ui/social-auth-form";

export const metadata: Metadata = {
  title: "Sign in | Grabbin",
};

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}>): Promise<ReactNode> {
  const { redirectTo } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <SocialAuthForm
        mode="sign-in"
        redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
      />
    </main>
  );
}
