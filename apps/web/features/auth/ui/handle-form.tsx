"use client";

import { HandleInput } from "@/features/auth/ui/handle-input";
import { profileQueries } from "@/features/profile/queries";
import { api as browserApi } from "@/lib/api-client";
import {
  availableHandleSchema,
  handleSchema,
} from "@grabbin/shared/schemas/page";
import { Button } from "@grabbin/ui/components/button";
import { useMutation } from "@tanstack/react-query";
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

export const useHandleCheck = () => {
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const requestId = useRef(0);
  const { mutateAsync: checkHandleAvailability } = useMutation(
    profileQueries.checkHandle(browserApi),
  );

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
    [checkHandleAvailability],
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

export const useDebouncedHandleCheck = (
  handleInput: string,
  initialHandle: string | undefined,
  check: (handle: string) => Promise<string | undefined>,
  setCheckedHandle: (handle: string | undefined) => void,
): void => {
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
};

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
        size="xl"
      >
        Continue
      </Button>
    </form>
  );
}
