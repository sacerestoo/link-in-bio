"use client";

import { signInWithSocial, type SocialProvider } from "@/features/auth/api";
import { Button } from "@grabbin/ui/components/button";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type AuthMode = "sign-in" | "sign-up";

const providers: ReadonlyArray<{
  id: SocialProvider;
  icon?: string;
  label: string;
}> = [
  {
    id: "google",
    icon: "/google-icon.svg",
    label: "Google",
  },
  { id: "line", icon: "/line-icon.svg", label: "LINE" },
  {
    id: "twitter",
    icon: "/x-icon.svg",
    label: "Twitter",
  },
];

function SocialAuthButtons({
  errorMessage,
  onSignIn,
  pendingProvider,
}: Readonly<{
  errorMessage: string | undefined;
  onSignIn: (provider: SocialProvider) => Promise<void>;
  pendingProvider: SocialProvider | undefined;
}>): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            className="gap-2 rounded-full"
            disabled={pendingProvider !== undefined}
            pending={pendingProvider === provider.id}
            onClick={() => {
              void onSignIn(provider.id);
            }}
            type="button"
            variant="secondary"
            size="2xl"
          >
            {provider.icon === undefined ? null : (
              <Image
                alt=""
                height={18}
                src={provider.icon}
                width={18}
              />
            )}
            {provider.label}
          </Button>
        ))}
      </div>

      {errorMessage === undefined ? null : (
        <p
          className="mt-3 text-center text-xs text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </>
  );
}

function SignUpLink({ mode }: Readonly<{ mode: AuthMode }>): ReactNode {
  const isSignUp = mode === "sign-up";

  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      {isSignUp ? "Already have an account? " : "Don't have an account? "}
      <Link
        className="font-medium text-foreground underline-offset-4 hover:underline"
        href={isSignUp ? "/sign-in" : "/sign-up"}
      >
        {isSignUp ? "Sign in" : "Create an account"}
      </Link>
    </p>
  );
}

export default function SocialAuthForm({
  mode,
}: Readonly<{ mode: AuthMode }>): ReactNode {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const isSignUp = mode === "sign-up";

  async function handleSignIn(provider: SocialProvider) {
    setErrorMessage(undefined);
    setPendingProvider(provider);

    try {
      const result = await signInWithSocial(provider);
      if (result.error !== null && result.error !== undefined) {
        setErrorMessage(
          result.error.message ?? "Sign-in could not start. Please try again.",
        );
        setPendingProvider(undefined);
      }
    } catch {
      setErrorMessage("Sign-in could not start. Please try again.");
      setPendingProvider(undefined);
    }
  }

  return (
    <div className="w-full max-w-xs">
      <section className="rounded-2xl bg-background">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-xl font-medium tracking-tight">
            {isSignUp ? "Create your account" : "Welcome"}
          </h1>
        </div>
        <SocialAuthButtons
          errorMessage={errorMessage}
          onSignIn={handleSignIn}
          pendingProvider={pendingProvider}
        />
        <SignUpLink mode={mode} />
      </section>
    </div>
  );
}
