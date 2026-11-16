"use client";

import { requestAccountDeletion } from "@/features/settings/api";
import { AlertDialog } from "@grabbin/ui/components/alert-dialog";
import { Button } from "@grabbin/ui/components/button";
import { Drawer } from "@grabbin/ui/components/drawer";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@grabbin/ui/components/field";
import { useIsMobile } from "@grabbin/ui/hooks/use-mobile";
import { overlay } from "overlay-kit";
import { useState, type SubmitEvent } from "react";
import { DeleteAccountContent } from "./delete-account-content";

export function DeleteAccountSection({ email }: Readonly<{ email: string }>) {
  return (
    <Field className="rounded-2xl shadow-default">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="space-y-1">
          <FieldLabel className="text-base">Delete account</FieldLabel>
          <FieldDescription className="text-sm">
            Permanently delete your account and all of its data. This action
            cannot be undone.
          </FieldDescription>
        </div>
        <Button
          type="button"
          variant="danger"
          size="lg"
          className="shrink-0 rounded-full px-3"
          onClick={() => {
            overlay.open((props) => (
              <DeleteAccountOverlay
                {...props}
                email={email}
              />
            ));
          }}
        >
          Delete
        </Button>
      </div>
    </Field>
  );
}

function DeleteAccountOverlay({
  isOpen,
  close,
  unmount,
  email,
}: Readonly<{
  isOpen: boolean;
  close: () => void;
  unmount: () => void;
  email: string;
}>) {
  const [clickCount, setClickCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const isMobile = useIsMobile();
  const Surface = isMobile ? Drawer : AlertDialog;

  function onConfirm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCount = clickCount + 1;
    setClickCount(Math.min(nextCount, 3));
    if (nextCount >= 4) {
      void requestDeletion(setSending, setSent, setError);
    }
  }

  return (
    <Surface
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !sending) dismissOverlay(close, unmount, isMobile);
      }}
    >
      <DeleteAccountContent
        email={email}
        error={error}
        sent={sent}
        sending={sending}
        clickCount={clickCount}
        isMobile={isMobile}
        onConfirm={onConfirm}
      />
    </Surface>
  );
}

function dismissOverlay(
  close: () => void,
  unmount: () => void,
  isMobile: boolean,
) {
  close();
  window.setTimeout(unmount, isMobile ? 500 : 200);
}

async function requestDeletion(
  setSending: (sending: boolean) => void,
  setSent: (sent: boolean) => void,
  setError: (error: string | undefined) => void,
) {
  setSending(true);
  setError(undefined);
  try {
    const { data, error } = await requestAccountDeletion(
      `${window.location.origin}/sign-in`,
    );
    if (error) throw new Error(error.message);
    if (data.message === "User deleted") {
      window.location.assign("/sign-in");
      return;
    }
    setSent(data.message === "Verification email sent");
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : "Please try again.");
  } finally {
    setSending(false);
  }
}
