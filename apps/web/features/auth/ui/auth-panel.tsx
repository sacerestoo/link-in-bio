"use client";

import type { SocialProvider } from "@/features/auth/api";
import { socialProviders } from "@/features/auth/social-providers";
import EmailOtpForm from "@/features/auth/ui/email-otp-form";
import EmailOtpVerificationForm from "@/features/auth/ui/email-otp-verification-form";
import HandleForm from "@/features/auth/ui/handle-form";
import { Button } from "@grabbin/ui/components/button";
import Image from "next/image";
import Link from "next/link";
import { Activity, type ReactNode } from "react";

export type AuthMode = "sign-in" | "sign-up";

function SignUpLink({
  mode,
  redirectTo,
}: Readonly<{ mode: AuthMode; redirectTo: string | undefined }>): ReactNode {
  const isSignUp = mode === "sign-up";
  const href = isSignUp ? "/sign-in" : "/sign-up";
  const link =
    redirectTo === undefined
      ? href
      : `${href}?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      {isSignUp ? "Already have an account? " : "Don't have an account? "}
      <Link
        className="font-medium text-brand underline-offset-4 hover:underline"
        href={link}
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
      {socialProviders.map((provider) => (
        <Button
          key={provider.id}
          className={
            provider.id === "line" ? "col-span-2 rounded-full" : "rounded-full"
          }
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
  redirectTo,
}: Readonly<{
  mode: AuthMode;
  errorMessage: string | undefined;
  redirectTo: string | undefined;
}>): ReactNode {
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
      <SignUpLink
        mode={mode}
        redirectTo={redirectTo}
      />
    </>
  );
}

function AuthHeading({ title }: Readonly<{ title: string }>): ReactNode {
  return (
    <header className="mb-6 space-y-1 text-center">
      <h1 className="text-xl font-medium tracking-tight">{title}</h1>
    </header>
  );
}

type AuthPanelProps = Readonly<{
  mode: AuthMode;
  initialHandle: string | undefined;
  redirectTo: string | undefined;
  confirmedHandle: string | undefined;
  pendingProvider: SocialProvider | undefined;
  errorMessage: string | undefined;
  emailOtp: string | undefined;
  onOtpSent: (email: string) => void;
  onUseDifferentEmail: () => void;
  onConfirmed: (handle: string) => void;
  onInvalidInitialHandle: () => void;
  onSignIn: (provider: SocialProvider) => void;
}>;

type AuthStartStageProps = Omit<
  AuthPanelProps,
  "emailOtp" | "onUseDifferentEmail"
>;

function AuthStartStage({
  mode,
  initialHandle,
  redirectTo,
  confirmedHandle,
  pendingProvider,
  errorMessage,
  onOtpSent,
  onConfirmed,
  onInvalidInitialHandle,
  onSignIn,
}: AuthStartStageProps): ReactNode {
  const isChoosingHandle = mode === "sign-up" && confirmedHandle === undefined;
  const title = isChoosingHandle
    ? "Choose your handle"
    : mode === "sign-up"
      ? "Create your account"
      : "Good to see you again";

  return (
    <section className="rounded-2xl bg-background">
      <AuthHeading title={title} />
      {isChoosingHandle ? (
        <HandleForm
          initialHandle={initialHandle}
          onConfirmed={onConfirmed}
          onInvalidInitialHandle={onInvalidInitialHandle}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <EmailOtpForm onOtpSent={onOtpSent} />
          <SocialProviderButtons
            onSignIn={onSignIn}
            pendingProvider={pendingProvider}
          />
        </div>
      )}
      <AuthFeedback
        errorMessage={errorMessage}
        mode={mode}
        redirectTo={redirectTo}
      />
    </section>
  );
}

export default function AuthPanel(props: AuthPanelProps): ReactNode {
  const {
    mode,
    emailOtp,
    initialHandle,
    redirectTo,
    confirmedHandle,
    pendingProvider,
    errorMessage,
    onOtpSent,
    onUseDifferentEmail,
    onConfirmed,
    onInvalidInitialHandle,
    onSignIn,
  } = props;

  return (
    <div className="w-full max-w-xs">
      <Activity mode={emailOtp === undefined ? "visible" : "hidden"}>
        <AuthStartStage
          confirmedHandle={confirmedHandle}
          errorMessage={errorMessage}
          initialHandle={initialHandle}
          mode={mode}
          onConfirmed={onConfirmed}
          onInvalidInitialHandle={onInvalidInitialHandle}
          onOtpSent={onOtpSent}
          onSignIn={onSignIn}
          pendingProvider={pendingProvider}
          redirectTo={redirectTo}
        />
      </Activity>
      <Activity mode={emailOtp === undefined ? "hidden" : "visible"}>
        {emailOtp === undefined ? null : (
          <EmailOtpVerificationForm
            email={emailOtp}
            handle={mode === "sign-up" ? confirmedHandle : undefined}
            onUseDifferentEmail={onUseDifferentEmail}
            redirectTo={redirectTo}
          />
        )}
      </Activity>
    </div>
  );
}
