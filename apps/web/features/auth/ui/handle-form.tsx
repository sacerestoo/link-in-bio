"use client";

import { checkHandleAvailability } from "@/features/auth/api";
import {
  availableUsernameSchema,
  usernameSchema,
} from "@grabbin/shared/schemas/profile";
import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import { Label } from "@grabbin/ui/components/label";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as v from "valibot";

type HandleFormProps = Readonly<{
  initialHandle: string | undefined;
  onConfirmed: (handle: string) => void;
  onInvalidInitialHandle: () => void;
}>;

const useHandleCheck = () => {
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);

  const check = useCallback(
    async (handle: string): Promise<string | undefined> => {
      setError(undefined);
      const result = v.safeParse(usernameSchema, handle);
      if (!result.success) {
        setError(result.issues.map((issue) => issue.message).join(" "));
        return undefined;
      }

      setChecking(true);
      try {
        const response = await checkHandleAvailability(result.output);
        const { available } = await response.json();
        const checked = v.safeParse(
          availableUsernameSchema(available),
          result.output,
        );
        if (!checked.success) {
          setError(checked.issues.map((issue) => issue.message).join(" "));
          return undefined;
        }
        return checked.output;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : undefined);
        return undefined;
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  return { check, checking, error };
};

function useInitialHandle(
  initialHandle: string | undefined,
  checkedHandle: RefObject<string | undefined>,
  check: (handle: string) => Promise<string | undefined>,
  onConfirmed: HandleFormProps["onConfirmed"],
  onInvalidInitialHandle: HandleFormProps["onInvalidInitialHandle"],
  setHandleInput: (handle: string) => void,
): void {
  useEffect(() => {
    let active = true;
    if (
      initialHandle !== undefined &&
      initialHandle !== checkedHandle.current
    ) {
      setHandleInput(initialHandle);
      void check(initialHandle).then((handle) => {
        if (active) {
          if (handle === undefined) onInvalidInitialHandle();
          else {
            checkedHandle.current = handle;
            onConfirmed(handle);
          }
        }
        return handle;
      });
    }
    return () => {
      active = false;
    };
  }, [
    check,
    checkedHandle,
    initialHandle,
    onConfirmed,
    onInvalidInitialHandle,
    setHandleInput,
  ]);
}

function HandleInput({
  value,
  error,
  disabled,
  onChange,
}: Readonly<{
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}>): ReactNode {
  return (
    <div className="space-y-2">
      <Label
        className="sr-only"
        htmlFor="page-handle"
      >
        Page handle
      </Label>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        aria-describedby={error === undefined ? undefined : "handle-error"}
        aria-invalid={error !== undefined}
        disabled={disabled}
        id="page-handle"
        maxLength={30}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="your-name"
        size="xl"
        className="text-sm"
        value={value}
        variant="flat"
      />
      {error === undefined ? null : (
        <p
          className="text-xs text-destructive"
          id="handle-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function submitHandle(
  event: React.SubmitEvent<HTMLFormElement>,
  handleInput: string,
  check: (handle: string) => Promise<string | undefined>,
  checkedHandle: RefObject<string | undefined>,
  onConfirmed: HandleFormProps["onConfirmed"],
): void {
  event.preventDefault();
  void check(handleInput).then((handle) => {
    if (handle !== undefined) {
      checkedHandle.current = handle;
      onConfirmed(handle);
    }
    return handle;
  });
}

export default function HandleForm({
  initialHandle,
  onConfirmed,
  onInvalidInitialHandle,
}: HandleFormProps): ReactNode {
  const [handleInput, setHandleInput] = useState("");
  const { check, checking, error } = useHandleCheck();
  const checkedHandle = useRef<string | undefined>(undefined);
  useInitialHandle(
    initialHandle,
    checkedHandle,
    check,
    onConfirmed,
    onInvalidInitialHandle,
    setHandleInput,
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        submitHandle(event, handleInput, check, checkedHandle, onConfirmed);
      }}
    >
      <HandleInput
        disabled={checking}
        error={error}
        onChange={setHandleInput}
        value={handleInput}
      />
      <Button
        className="w-full rounded-xl"
        disabled={checking}
        pending={checking}
        type="submit"
        variant="outline"
        size="xl"
      >
        Check
      </Button>
    </form>
  );
}
