import { useMutation } from "@tanstack/react-query";
import { debounce } from "es-toolkit/function";
import { useCallback, useEffect } from "react";
import * as v from "valibot";

type HandleCheckOptions = Readonly<{
  handleInput: string;
  initialHandle: string | undefined;
  onCheckHandle: (handle: string) => Promise<string>;
  onCheckedHandleChange?: (handle: string | undefined) => void;
}>;

export const useHandleAvailabilityCheck = ({
  handleInput,
  initialHandle,
  onCheckHandle,
  onCheckedHandleChange,
}: HandleCheckOptions) => {
  const {
    data: checkedHandle,
    mutateAsync,
    isPending,
    error,
    reset,
  } = useMutation({ mutationFn: (handle: string) => onCheckHandle(handle) });
  const checkHandle = useCallback(
    async (handle: string): Promise<string | undefined> => {
      try {
        return await mutateAsync(handle);
      } catch {
        return undefined;
      }
    },
    [mutateAsync],
  );

  useEffect(() => {
    let active = true;
    const checkDebounced = debounce((handle: string) => {
      void checkHandle(handle).then((checked) => {
        if (active)
          onCheckedHandleChange?.(checked === undefined ? undefined : handle);
        return checked;
      });
    }, 300);
    if (handleInput !== "" && handleInput !== initialHandle)
      checkDebounced(handleInput);

    return () => {
      active = false;
      checkDebounced.cancel();
    };
  }, [handleInput, initialHandle, checkHandle, onCheckedHandleChange]);

  return {
    onCheckHandle: checkHandle,
    checkedHandle,
    checking: isPending,
    reset,
    error: getHandleCheckError(error),
  };
};

const getHandleCheckError = (cause: unknown): string | undefined => {
  if (cause instanceof v.ValiError) {
    const issues = cause.issues as ReadonlyArray<{ message: string }>;
    return issues.map((issue) => issue.message).join(" ");
  }
  return cause instanceof Error ? cause.message : undefined;
};
