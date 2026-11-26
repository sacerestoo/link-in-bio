import { api } from "@/lib/api-client";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
} from "@grabbin/shared/schemas/page";
import { useMutation } from "@tanstack/react-query";
import { debounce } from "es-toolkit/function";
import { useCallback, useEffect } from "react";
import * as v from "valibot";

type HandleCheckOptions = Readonly<{
  handleInput: string;
  initialHandle: string | undefined;
  onCheckedHandleChange?: (handle: string | undefined) => void;
}>;

const checkHandle = async (rawHandle: string): Promise<Handle> => {
  const handle = v.parse(handleSchema, rawHandle);
  const { available } = v.parse(
    v.object({ available: v.boolean() }),
    await api.v1.pages.handle
      .$post({ json: { handle } })
      .then((response) => response.json()),
  );
  if (!available) throw new Error(HANDLE_UNAVAILABLE_MESSAGE);
  return handle;
};

export const useHandleAvailabilityCheck = ({
  handleInput,
  initialHandle,
  onCheckedHandleChange,
}: HandleCheckOptions) => {
  const {
    data: checkedHandle,
    mutateAsync,
    isPending,
    error,
    reset,
  } = useMutation({
    mutationKey: ["handle-availability", "check"],
    mutationFn: checkHandle,
  });
  const checkHandleSafely = useCallback(
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
      void checkHandleSafely(handle).then((checked) => {
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
  }, [handleInput, initialHandle, checkHandleSafely, onCheckedHandleChange]);

  return {
    onCheckHandle: checkHandleSafely,
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
