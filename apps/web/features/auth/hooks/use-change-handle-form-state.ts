import { useHandleCheck } from "@/features/auth/hooks/use-handle-check";
import { useState } from "react";

export const useChangeHandleFormState = (currentHandle: string) => {
  const [requestedHandleInput, setRequestedHandleInput] =
    useState(currentHandle);
  const { checkedHandle, checking, error, reset } = useHandleCheck(
    requestedHandleInput,
    currentHandle,
  );
  const requestedHandleIsCurrent = requestedHandleInput === currentHandle;
  const requestedHandleIsChecked = checkedHandle === requestedHandleInput;
  const canSave = requestedHandleIsChecked && !requestedHandleIsCurrent;
  const isValid =
    requestedHandleIsCurrent ||
    (requestedHandleIsChecked && !checking && error === undefined);
  const onChange = (requestedHandle: string) => {
    reset();
    setRequestedHandleInput(requestedHandle);
  };

  return {
    requestedHandleInput,
    canSave,
    checking,
    error: requestedHandleIsCurrent ? undefined : error,
    isValid,
    onChange,
  };
};
