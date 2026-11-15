"use client";

import { signInWithSocial, type SocialProvider } from "@/features/auth/api";
import AuthPanel, { type AuthMode } from "@/features/auth/ui/auth-panel";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

function useHandleConfirmation(
  initialHandle: string | undefined,
  redirectTo: string | undefined,
) {
  const router = useRouter();
  const redirectQuery = new URLSearchParams(
    redirectTo === undefined ? undefined : { redirectTo },
  ).toString();
  const onConfirmed = useCallback(
    (handle: string) => {
      if (initialHandle !== handle) {
        const query = new URLSearchParams(redirectQuery);
        query.set("handle", handle);
        router.replace(`/sign-up?${query.toString()}`, { scroll: false });
      }
    },
    [initialHandle, redirectQuery, router],
  );
  const onInvalid = useCallback(() => {
    const suffix = redirectQuery.length === 0 ? "" : `?${redirectQuery}`;
    router.replace(`/sign-up${suffix}`, { scroll: false });
  }, [redirectQuery, router]);
  return { onConfirmed, onInvalid };
}

type SocialAuthFormProps = Readonly<{
  mode: AuthMode;
  initialHandle?: string;
  redirectTo?: string;
}>;

function useSocialSignIn(
  handle: string | undefined,
  redirectTo: string | undefined,
) {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();
  const [errorMessage, setErrorMessage] = useState<string>();

  function signIn(provider: SocialProvider): void {
    setErrorMessage(undefined);
    setPendingProvider(provider);
    void signInWithSocial(provider, handle, redirectTo)
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

  return { errorMessage, pendingProvider, signIn };
}

export default function SocialAuthForm({
  mode,
  initialHandle,
  redirectTo,
}: SocialAuthFormProps): ReactNode {
  const [confirmedHandle, setConfirmedHandle] = useState<string>();
  const [emailOtp, setEmailOtp] = useState<string>();
  const confirmation = useHandleConfirmation(initialHandle, redirectTo);
  const { errorMessage, pendingProvider, signIn } = useSocialSignIn(
    confirmedHandle,
    redirectTo,
  );

  return (
    <AuthPanel
      mode={mode}
      initialHandle={initialHandle}
      redirectTo={redirectTo}
      confirmedHandle={confirmedHandle}
      pendingProvider={pendingProvider}
      errorMessage={errorMessage}
      emailOtp={emailOtp}
      onOtpSent={setEmailOtp}
      onUseDifferentEmail={() => {
        setEmailOtp(undefined);
      }}
      onConfirmed={(handle) => {
        setConfirmedHandle(handle);
        confirmation.onConfirmed(handle);
      }}
      onInvalidInitialHandle={confirmation.onInvalid}
      onSignIn={signIn}
    />
  );
}
