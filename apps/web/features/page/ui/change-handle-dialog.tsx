"use client";

import type { ReactElement } from "react";
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
import { ChangeHandleForm } from "./change-handle-form";

type ChangeHandleDialogProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onUnmount: () => void;
}>;

export function ChangeHandleDialog({
  isOpen,
  onClose,
  onUnmount,
}: ChangeHandleDialogProps): ReactElement {
  const isMobile = useIsMobile();
  const Surface = isMobile ? Drawer : Dialog;
  const onDismiss = () => {
    closeChangeHandleOverlay(onClose, onUnmount, isMobile);
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
    <DialogContent
      showCloseButton={false}
      className={"rounded-4xl sm:max-w-xs"}
    >
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
  onClose: () => void,
  onUnmount: () => void,
  isMobile: boolean,
): void {
  onClose();
  window.setTimeout(onUnmount, isMobile ? 500 : 200);
}
