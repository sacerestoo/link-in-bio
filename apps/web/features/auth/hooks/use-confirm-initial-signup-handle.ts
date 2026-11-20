import { useEffect } from "react";

export const useConfirmInitialSignupHandle = (
  initialHandle: string | undefined,
  onCheckHandle: (handle: string) => Promise<string | undefined>,
  onConfirmed: (handle: string) => void,
  onInvalidInitialHandle: () => void,
  onHandleInputChange: (handle: string) => void,
): void => {
  useEffect(() => {
    let active = true;
    if (initialHandle !== undefined) {
      onHandleInputChange(initialHandle);
      void onCheckHandle(initialHandle).then((handle) => {
        if (active) {
          if (handle === undefined) onInvalidInitialHandle();
          else onConfirmed(handle);
        }
        return handle;
      });
    }
    return () => {
      active = false;
    };
  }, [
    initialHandle,
    onCheckHandle,
    onHandleInputChange,
    onConfirmed,
    onInvalidInitialHandle,
  ]);
};
