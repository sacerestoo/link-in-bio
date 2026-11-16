"use client";

import { checkHandleAvailability } from "@/features/auth/api";
import {
  availableHandleSchema,
  handleSchema,
} from "@grabbin/shared/schemas/page";
import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import { Label } from "@grabbin/ui/components/label";
import { debounce } from "es-toolkit/function";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
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
  const requestId = useRef(0);

  const check = useCallback(
    async (handle: string): Promise<string | undefined> => {
      const currentRequestId = ++requestId.current;
      setError(undefined);
      const result = v.safeParse(handleSchema, handle);
      if (!result.success) {
        if (currentRequestId === requestId.current) {
          setError(result.issues.map((issue) => issue.message).join(" "));
          setChecking(false);
        }
        return undefined;
      }

      setChecking(true);
      try {
        const response = await checkHandleAvailability(result.output);
        const { available } = await response.json();
        const checked = v.safeParse(
          availableHandleSchema(available),
          result.output,
        );
        if (!checked.success) {
          if (currentRequestId === requestId.current) {
            setError(checked.issues.map((issue) => issue.message).join(" "));
          }
          return undefined;
        }
        return checked.output;
      } catch (cause) {
        if (currentRequestId === requestId.current) {
          setError(cause instanceof Error ? cause.message : undefined);
        }
        return undefined;
      } finally {
        if (currentRequestId === requestId.current) setChecking(false);
      }
    },
    [],
  );

  return { check, checking, error };
};

function useInitialHandle(
  initialHandle: string | undefined,
  checkedHandle: string | undefined,
  setCheckedHandle: (handle: string | undefined) => void,
  check: (handle: string) => Promise<string | undefined>,
  onConfirmed: HandleFormProps["onConfirmed"],
  onInvalidInitialHandle: HandleFormProps["onInvalidInitialHandle"],
  setHandleInput: (handle: string) => void,
): void {
  useEffect(() => {
    let active = true;
    if (initialHandle !== undefined && initialHandle !== checkedHandle) {
      setHandleInput(initialHandle);
      void check(initialHandle).then((handle) => {
        if (active) {
          if (handle === undefined) onInvalidInitialHandle();
          else {
            setCheckedHandle(handle);
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
    setCheckedHandle,
    setHandleInput,
  ]);
}

function HandleInput({
  value,
  error,
  onChange,
}: Readonly<{
  value: string;
  error: string | undefined;
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

function useDebouncedHandleCheck(
  handleInput: string,
  initialHandle: string | undefined,
  check: (handle: string) => Promise<string | undefined>,
  setCheckedHandle: (handle: string | undefined) => void,
): void {
  useEffect(() => {
    let active = true;
    const checkDebounced = debounce((handle: string) => {
      void check(handle).then((checked) => {
        if (active)
          setCheckedHandle(checked === undefined ? undefined : handle);
        return checked;
      });
    }, 300);
    if (handleInput !== "" && handleInput !== initialHandle) {
      checkDebounced(handleInput);
    }
    return () => {
      active = false;
      checkDebounced.cancel();
    };
  }, [check, handleInput, initialHandle, setCheckedHandle]);
}

export default function HandleForm({
  initialHandle,
  onConfirmed,
  onInvalidInitialHandle,
}: HandleFormProps): ReactNode {
  const [handleInput, setHandleInput] = useState("");
  const [checkedHandle, setCheckedHandle] = useState<string>();
  const { check, checking, error } = useHandleCheck();
  useDebouncedHandleCheck(handleInput, initialHandle, check, setCheckedHandle);
  useInitialHandle(
    initialHandle,
    checkedHandle,
    setCheckedHandle,
    check,
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
        error={error}
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
        size="xl"
      >
        Continue
      </Button>
    </form>
  );
}
