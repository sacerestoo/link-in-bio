import type { Metadata } from "next";
import type { ReactNode } from "react";
import SocialAuthForm from "@/features/auth/ui/social-auth-form";

export const metadata: Metadata = {
  title: "Sign in | Grabbin",
};

export default function SignInPage(): ReactNode {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <SocialAuthForm mode="sign-in" />
    </main>
  );
}
