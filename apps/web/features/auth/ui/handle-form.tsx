"use client";

import { useConfirmInitialSignupHandle } from "@/features/auth/hooks/use-confirm-initial-signup-handle";
import { useHandleCheck } from "@/features/auth/hooks/use-handle-check";
import { Button } from "@grabbin/ui/components/button";
import { HandleInput } from "@grabbin/ui/components/handle-input";
import { useState, type ReactNode } from "react";

type HandleFormProps = Readonly<{
  initialHandle: string | undefined;
  onConfirmed: (handle: string) => void;
  onInvalidInitialHandle: () => void;
}>;

export default function HandleForm({
  initialHandle,
  onConfirmed,
  onInvalidInitialHandle,
}: HandleFormProps): ReactNode {
  const [handleInput, setHandleInput] = useState("");
  const [checkedHandle, setCheckedHandle] = useState<string>();
  const { onCheckHandle, checking, error } = useHandleCheck(
    handleInput,
    initialHandle,
    setCheckedHandle,
  );
  useConfirmInitialSignupHandle(
    initialHandle,
    onCheckHandle,
    onConfirmed,
    onInvalidInitialHandle,
    setHandleInput,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirmed(handleInput);
      }}
    >
      <HandleInput
        checking={checking}
        error={error}
        isValid={checkedHandle === handleInput && !checking}
        onChange={(handle) => {
          setCheckedHandle(undefined);
          setHandleInput(handle);
        }}
        value={handleInput}
      />
      <Button
        className="w-full rounded-xl"
        disabled={checking || checkedHandle !== handleInput}
        pending={checking}
        type="submit"
        variant="outline"
        size="2xl"
      >
        Continue
      </Button>
    </form>
  );
}
