"use client";

import type { ReactElement } from "react";
import { ChangeHandleForm } from "@/features/auth/ui/change-handle-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@grabbin/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { useIsMobile } from "@grabbin/ui/hooks/use-mobile";

type ChangeHandleDialogProps = Readonly<{
  isOpen: boolean;
  close: () => void;
  unmount: () => void;
}>;

export function ChangeHandleDialog({
  isOpen,
  close,
  unmount,
}: ChangeHandleDialogProps): ReactElement {
  const isMobile = useIsMobile();
  const Surface = isMobile ? Drawer : Dialog;
  const onDismiss = () => {
    closeChangeHandleOverlay(close, unmount, isMobile);
  };

  return (
    <Surface
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <ChangeHandleContent
        isMobile={isMobile}
        onSaved={onDismiss}
      />
    </Surface>
  );
}

function ChangeHandleContent({
  isMobile,
  onSaved,
}: Readonly<{
  isMobile: boolean;
  onSaved: () => void;
}>): ReactElement {
  const form = <ChangeHandleForm onSaved={onSaved} />;

  return isMobile ? (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Change your handle</DrawerTitle>
        <DrawerDescription className="sr-only">
          Choose a new handle for your page.
        </DrawerDescription>
      </DrawerHeader>
      <div className="p-4 pt-12">{form}</div>
    </DrawerContent>
  ) : (
    <DialogContent className={"rounded-4xl sm:max-w-xs"}>
      <DialogHeader className="mb-8">
        <DialogTitle>Change your handle</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a new handle for your page.
        </DialogDescription>
      </DialogHeader>
      {form}
    </DialogContent>
  );
}

function closeChangeHandleOverlay(
  close: () => void,
  unmount: () => void,
  isMobile: boolean,
): void {
  close();
  window.setTimeout(unmount, isMobile ? 500 : 200);
}
