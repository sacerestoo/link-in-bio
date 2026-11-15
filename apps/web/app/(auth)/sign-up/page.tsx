import type { Metadata } from "next";
import type { ReactNode } from "react";
import SocialAuthForm from "@/features/auth/ui/social-auth-form";

export const metadata: Metadata = {
  title: "Create an account | Grabbin",
};

export default async function SignUpPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ handle?: string | string[] }>;
}>): Promise<ReactNode> {
  const { handle } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <SocialAuthForm
        initialHandle={typeof handle === "string" ? handle : undefined}
        mode="sign-up"
      />
    </main>
  );
}
