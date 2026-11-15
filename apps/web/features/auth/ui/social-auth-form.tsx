"use client";

import { signInWithSocial, type SocialProvider } from "@/features/auth/api";
import HandleForm from "@/features/auth/ui/handle-form";
import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

type AuthMode = "sign-in" | "sign-up";

const providers: ReadonlyArray<{
  id: SocialProvider;
  icon: string;
  label: string;
}> = [
  {
    id: "google",
    icon: "/google-icon.svg",
    label: "Google",
  },
  {
    id: "twitter",
    icon: "/x-icon.svg",
    label: "Twitter",
  },
  { id: "line", icon: "/line-icon.svg", label: "LINE" },
];

function SignUpLink({ mode }: Readonly<{ mode: AuthMode }>): ReactNode {
  const isSignUp = mode === "sign-up";

  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {isSignUp ? "Already have an account? " : "Don't have an account? "}
      <Link
        className="font-normal text-brand underline-offset-4 hover:underline"
        href={isSignUp ? "/sign-in" : "/sign-up"}
        prefetch={false}
      >
        {isSignUp ? "Sign in" : "Register"}
      </Link>
    </p>
  );
}

function SocialProviderButtons({
  pendingProvider,
  onSignIn,
}: Readonly<{
  pendingProvider: SocialProvider | undefined;
  onSignIn: (provider: SocialProvider) => void;
}>): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          className={cn(
            "rounded-xl",
            provider.id === "line" ? "col-span-2" : undefined,
          )}
          disabled={pendingProvider !== undefined}
          pending={pendingProvider === provider.id}
          onClick={() => {
            onSignIn(provider.id);
          }}
          type="button"
          variant="outline"
          size="xl"
        >
          <Image
            alt=""
            height={18}
            src={provider.icon}
            width={18}
          />
          {provider.label}
        </Button>
      ))}
    </div>
  );
}

function AuthFeedback({
  mode,
  errorMessage,
}: Readonly<{ mode: AuthMode; errorMessage: string | undefined }>): ReactNode {
  return (
    <>
      {errorMessage === undefined ? null : (
        <p
          className="mt-3 text-center text-xs text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      <SignUpLink mode={mode} />
    </>
  );
}

function AuthHeading({ title }: Readonly<{ title: string }>): ReactNode {
  return (
    <div className="mb-6 space-y-1 text-center">
      <h1 className="text-xl font-medium tracking-tight">{title}</h1>
    </div>
  );
}

function AuthPanel({
  mode,
  initialHandle,
  confirmedHandle,
  pendingProvider,
  errorMessage,
  onConfirmed,
  onInvalidInitialHandle,
  onSignIn,
}: Readonly<{
  mode: AuthMode;
  initialHandle: string | undefined;
  confirmedHandle: string | undefined;
  pendingProvider: SocialProvider | undefined;
  errorMessage: string | undefined;
  onConfirmed: (handle: string) => void;
  onInvalidInitialHandle: () => void;
  onSignIn: (provider: SocialProvider) => void;
}>): ReactNode {
  const isChoosingHandle = mode === "sign-up" && confirmedHandle === undefined;
  const title = isChoosingHandle
    ? "Choose your handle"
    : mode === "sign-up"
      ? "Create your account"
      : "Welcome";

  return (
    <div className="w-full max-w-xs">
      <section className="rounded-2xl bg-background">
        <AuthHeading title={title} />
        {isChoosingHandle ? (
          <HandleForm
            initialHandle={initialHandle}
            onConfirmed={onConfirmed}
            onInvalidInitialHandle={onInvalidInitialHandle}
          />
        ) : (
          <SocialProviderButtons
            onSignIn={onSignIn}
            pendingProvider={pendingProvider}
          />
        )}
        <AuthFeedback
          errorMessage={errorMessage}
          mode={mode}
        />
      </section>
    </div>
  );
}

function useHandleConfirmation(initialHandle: string | undefined) {
  const router = useRouter();
  const onConfirmed = useCallback(
    (handle: string) => {
      if (initialHandle !== handle) {
        router.replace(`/sign-up?handle=${encodeURIComponent(handle)}`, {
          scroll: false,
        });
      }
    },
    [initialHandle, router],
  );
  const onInvalid = useCallback(() => {
    router.replace("/sign-up", { scroll: false });
  }, [router]);
  return { onConfirmed, onInvalid };
}

export default function SocialAuthForm({
  mode,
  initialHandle,
}: Readonly<{ mode: AuthMode; initialHandle?: string }>): ReactNode {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirmedHandle, setConfirmedHandle] = useState<string>();
  const { onConfirmed, onInvalid } = useHandleConfirmation(initialHandle);

  function handleSignIn(provider: SocialProvider): void {
    setErrorMessage(undefined);
    setPendingProvider(provider);

    void signInWithSocial(provider, confirmedHandle)
      .then((result) => {
        if (result.error !== null && result.error !== undefined) {
          setErrorMessage(
            result.error.message ??
              "Sign-in could not start. Please try again.",
          );
          setPendingProvider(undefined);
        }
        return result;
      })
      .catch(() => {
        setErrorMessage("Sign-in could not start. Please try again.");
        setPendingProvider(undefined);
      });
  }

  return (
    <AuthPanel
      mode={mode}
      initialHandle={initialHandle}
      confirmedHandle={confirmedHandle}
      pendingProvider={pendingProvider}
      errorMessage={errorMessage}
      onConfirmed={(handle) => {
        setConfirmedHandle(handle);
        onConfirmed(handle);
      }}
      onInvalidInitialHandle={onInvalid}
      onSignIn={handleSignIn}
    />
  );
}
