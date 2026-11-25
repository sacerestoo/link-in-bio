import { useHandleAvailabilityCheck } from "@/lib/use-handle-availability-check";
import { useState } from "react";
import { checkHandle } from "../queries";

export const useChangeHandleFormState = (currentHandle: string) => {
  const [requestedHandleInput, setRequestedHandleInput] =
    useState(currentHandle);
  const { checkedHandle, checking, error, reset } = useHandleAvailabilityCheck({
    handleInput: requestedHandleInput,
    initialHandle: currentHandle,
    onCheckHandle: checkHandle,
  });
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
