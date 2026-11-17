"use client";

import { sendEmailOtp } from "@/features/auth/auth";
import { Button } from "@grabbin/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@grabbin/ui/components/field";
import { Input } from "@grabbin/ui/components/input";
import { useState, type ReactNode, type SubmitEvent } from "react";

type EmailOtpFormProps = Readonly<{
  onOtpSent: (email: string) => void;
}>;

function EmailField({
  email,
  errorMessage,
  onChange,
}: Readonly<{
  email: string;
  errorMessage: string | undefined;
  onChange: (email: string) => void;
}>): ReactNode {
  return (
    <Field>
      <FieldLabel
        className="sr-only"
        htmlFor="email"
      >
        Email
      </FieldLabel>
      <Input
        autoComplete="off"
        className="text-sm"
        id="email"
        name="email"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Email"
        required
        size="xl"
        type="email"
        value={email}
      />
      {errorMessage === undefined ? null : (
        <FieldError className="text-xs">{errorMessage}</FieldError>
      )}
    </Field>
  );
}

function useEmailOtpSubmit(onOtpSent: EmailOtpFormProps["onOtpSent"]) {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function submit(
    event: SubmitEvent<HTMLFormElement>,
    email: string,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(undefined);
    setIsPending(true);
    try {
      const { error } = await sendEmailOtp(email.trim());
      if (error) {
        setErrorMessage(
          error.message ?? "Unable to send the code. Please try again.",
        );
      } else {
        onOtpSent(email.trim());
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return { errorMessage, isPending, submit };
}

export default function EmailOtpForm({
  onOtpSent,
}: EmailOtpFormProps): ReactNode {
  const [email, setEmail] = useState("");
  const { errorMessage, isPending, submit } = useEmailOtpSubmit(onOtpSent);

  return (
    <form
      onSubmit={(event) => {
        void submit(event, email);
      }}
    >
      <FieldGroup className="gap-4">
        <EmailField
          email={email}
          errorMessage={errorMessage}
          onChange={setEmail}
        />
        <Field>
          <Button
            className="w-full rounded-xl"
            pending={isPending}
            size="xl"
            type="submit"
            variant="brand"
          >
            Send OTP
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
