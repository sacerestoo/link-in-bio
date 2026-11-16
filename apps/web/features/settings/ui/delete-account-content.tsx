"use client";

import type { SubmitEvent } from "react";
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@grabbin/ui/components/alert-dialog";
import { Button } from "@grabbin/ui/components/button";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { FieldError } from "@grabbin/ui/components/field";
import CircleCheck from "lucide-react/icons/circle-check";

export function DeleteAccountContent({
  email,
  error,
  sent,
  sending,
  clickCount,
  isMobile,
  onConfirm,
}: {
  email: string;
  error?: string;
  sent: boolean;
  sending: boolean;
  clickCount: number;
  isMobile: boolean;
  onConfirm: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  const Content = isMobile ? DrawerContent : AlertDialogContent;
  const Header = isMobile ? DrawerHeader : AlertDialogHeader;
  const Footer = isMobile ? DrawerFooter : AlertDialogFooter;
  return (
    <Content className="min-h-64">
      <Header className="flex flex-col gap-1.5">
        <DeleteAccountCopy
          email={email}
          sent={sent}
        />
      </Header>
      {error !== undefined && <FieldError>{error}</FieldError>}
      <form
        onSubmit={onConfirm}
        className="flex flex-1 justify-end"
      >
        <Footer className="items-end">
          <DeleteAccountActions
            clickCount={clickCount}
            isMobile={isMobile}
            sent={sent}
            sending={sending}
          />
        </Footer>
      </form>
    </Content>
  );
}

function DeleteAccountCopy({ email, sent }: { email: string; sent: boolean }) {
  const Title = sent ? DrawerTitle : AlertDialogTitle;
  const Description = sent ? DrawerDescription : AlertDialogDescription;
  const copy = (
    <>
      <Title>{sent ? "Check your inbox" : "Delete your account?"}</Title>
      <Description>
        {sent ? (
          <>
            We sent a deletion link to{" "}
            <strong className="font-medium text-primary">{email}</strong>. Open
            it to finish deleting your account.
          </>
        ) : (
          "Your account and all associated data will be permanently deleted. This action can't be undone."
        )}
      </Description>
    </>
  );
  return sent ? (
    <>
      <span
        className="auth-success-entry auth-success self-start"
        data-state="in"
        aria-hidden="true"
      >
        <CircleCheck className="size-9" />
      </span>
      <div
        className="account-delete-success-copy grid w-full gap-1.5"
        data-state="in"
      >
        {copy}
      </div>
    </>
  ) : (
    copy
  );
}

function DeleteAccountActions({
  clickCount,
  isMobile,
  sent,
  sending,
}: {
  clickCount: number;
  isMobile: boolean;
  sent: boolean;
  sending: boolean;
}) {
  if (sent) {
    return isMobile ? (
      <DrawerClose render={<Button size="lg" />}>Okay, I got it</DrawerClose>
    ) : (
      <AlertDialogCancel size="lg">Okay, I got it</AlertDialogCancel>
    );
  }
  return (
    <>
      {isMobile ? (
        <DrawerClose
          disabled={sending}
          render={
            <Button
              size="lg"
              variant="outline"
              className="min-w-32"
            />
          }
        >
          Cancel
        </DrawerClose>
      ) : (
        <AlertDialogCancel
          size="lg"
          disabled={sending}
          className="min-w-32"
        >
          Cancel
        </AlertDialogCancel>
      )}
      <DeleteAccountButton
        clickCount={clickCount}
        sending={sending}
      />
    </>
  );
}

function DeleteAccountButton({
  clickCount,
  sending,
}: {
  clickCount: number;
  sending: boolean;
}) {
  const label = sending
    ? "Sending link…"
    : ["Delete", "Click again", "One more time", "Delete anyway"][
        Math.min(clickCount, 3)
      ];
  return (
    <Button
      type="submit"
      size="lg"
      variant="danger"
      pending={sending}
      className="relative min-w-32 overflow-hidden"
    >
      {label}
      {!sending && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 bottom-1 h-1 overflow-hidden rounded-full bg-white/25"
        >
          <span
            className="block h-full origin-left rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: `scaleX(${clickCount / 3})` }}
          />
        </span>
      )}
    </Button>
  );
}
