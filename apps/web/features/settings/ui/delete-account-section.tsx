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
                email={email}
                isOpen={props.isOpen}
                onClose={props.close}
                onUnmount={props.unmount}
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
  onClose,
  onUnmount,
  email,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onUnmount: () => void;
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
      void requestDeletion(setSending, setSent, (message) => {
        setError(message);
      });
    }
  }

  return (
    <Surface
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !sending) dismissOverlay(onClose, onUnmount, isMobile);
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
  onClose: () => void,
  onUnmount: () => void,
  isMobile: boolean,
) {
  onClose();
  window.setTimeout(onUnmount, isMobile ? 500 : 200);
}

async function requestDeletion(
  onSendingChange: (sending: boolean) => void,
  onSentChange: (sent: boolean) => void,
  onErrorChange: (error?: string) => void,
) {
  onSendingChange(true);
  onErrorChange();
  try {
    const { data, error } = await requestAccountDeletion(
      `${window.location.origin}/sign-in`,
    );
    if (error) throw new Error(error.message);
    if (data.message === "User deleted") {
      window.location.assign("/sign-in");
      return;
    }
    onSentChange(data.message === "Verification email sent");
  } catch (cause) {
    onErrorChange(cause instanceof Error ? cause.message : "Please try again.");
  } finally {
    onSendingChange(false);
  }
}
