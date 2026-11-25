"use client";

import {
  getAuthCallbackURL,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/features/auth/auth";
import { Button } from "@grabbin/ui/components/button";
import { Field, FieldError, FieldLabel } from "@grabbin/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@grabbin/ui/components/input-otp";
import { useState, type ReactNode } from "react";

type EmailOtpVerificationFormProps = Readonly<{
  email: string;
  handle?: string;
  redirectTo: string | undefined;
  onUseDifferentEmail: () => void;
}>;

async function resendEmail(
  email: string,
  onErrorChange: (message: string) => void,
  onSendingChange: (isSending: boolean) => void,
): Promise<void> {
  onErrorChange("");
  onSendingChange(true);
  try {
    const { error } = await sendEmailOtp(email);
    if (error)
      onErrorChange(
        error.message ?? "Unable to send the code. Please try again.",
      );
  } catch {
    onErrorChange("Something went wrong. Please try again.");
  } finally {
    onSendingChange(false);
  }
}

function useEmailOtpVerification(
  email: string,
  handle: string | undefined,
  redirectTo: string | undefined,
) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const resend = () => resendEmail(email, setError, setIsSending);

  async function verify(): Promise<void> {
    setError("");
    setIsSigningIn(true);
    try {
      const { error: verifyError } = await verifyEmailOtp(email, otp, handle);
      if (verifyError) {
        setError(verifyError.message ?? "That code didn't work. Try again.");
        return;
      }
      window.location.replace(getAuthCallbackURL(redirectTo));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return {
    error,
    isSending,
    isSigningIn,
    otp,
    resend,
    setError,
    setOtp,
    verify,
  };
}

function VerificationCode({
  error,
  otp,
  onChange,
}: Readonly<{
  error: string;
  otp: string;
  onChange: (value: string) => void;
}>): ReactNode {
  return (
    <Field data-invalid={error.length > 0}>
      <FieldLabel
        className="sr-only"
        htmlFor="email-otp"
      >
        Verification code
      </FieldLabel>
      <InputOTP
        aria-invalid={error.length > 0}
        containerClassName="justify-center"
        id="email-otp"
        maxLength={6}
        onChange={onChange}
        value={otp}
      >
        <InputOTPGroup size="2xl">
          {[...Array.from({ length: 6 }).keys()].map((index) => (
            <InputOTPSlot
              index={index}
              key={index}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error.length === 0 ? null : (
        <FieldError className="text-xs">{error}</FieldError>
      )}
    </Field>
  );
}

function UseDifferentEmailButton({
  onClick,
}: Readonly<{ onClick: () => void }>): ReactNode {
  return (
    <Button
      className="font-medium text-muted-foreground"
      onClick={onClick}
      size="xs"
      type="button"
      variant="link"
    >
      Use a different email
    </Button>
  );
}

function VerificationActions({
  canVerify,
  isSending,
  isSigningIn,
  onResend,
  onUseDifferentEmail,
  onVerify,
}: Readonly<{
  canVerify: boolean;
  isSending: boolean;
  isSigningIn: boolean;
  onResend: () => void;
  onUseDifferentEmail: () => void;
  onVerify: () => void;
}>): ReactNode {
  return (
    <Field className="gap-4">
      <Button
        className="w-full rounded-lg"
        disabled={!canVerify || isSigningIn}
        onClick={onVerify}
        pending={isSigningIn}
        size="2xl"
        type="button"
        variant="outline"
      >
        Verify code
      </Button>
      <div className="flex flex-col items-center gap-1">
        <Button
          className="w-full rounded-full text-muted-foreground"
          disabled={isSending}
          onClick={onResend}
          pending={isSending}
          size="xs"
          type="button"
          variant="link"
        >
          Resend code
        </Button>
        <UseDifferentEmailButton onClick={onUseDifferentEmail} />
      </div>
    </Field>
  );
}

export default function EmailOtpVerificationForm({
  email,
  handle,
  redirectTo,
  onUseDifferentEmail,
}: EmailOtpVerificationFormProps): ReactNode {
  const state = useEmailOtpVerification(email, handle, redirectTo);

  return (
    <section className="w-full rounded-2xl bg-background">
      <header className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-medium tracking-tight">Check your inbox</h1>
        <div>
          <p className="text-sm text-balance text-muted-foreground">
            We sent a verification code to{" "}
            <strong className="font-medium text-foreground">{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            It expires in 5 minutes.
          </p>
        </div>
      </header>
      <div className="grid w-full gap-4">
        <VerificationCode
          error={state.error}
          onChange={(value) => {
            state.setOtp(value);
            state.setError("");
          }}
          otp={state.otp}
        />
        <VerificationActions
          canVerify={state.otp.length === 6}
          isSending={state.isSending}
          isSigningIn={state.isSigningIn}
          onResend={() => {
            void state.resend();
          }}
          onUseDifferentEmail={onUseDifferentEmail}
          onVerify={() => {
            void state.verify();
          }}
        />
      </div>
    </section>
  );
}
