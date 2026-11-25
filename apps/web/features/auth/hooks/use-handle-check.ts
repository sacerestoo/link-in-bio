import { useHandleAvailabilityCheck } from "@/lib/use-handle-availability-check";
import { checkHandle } from "../queries";

export const useHandleCheck = (
  handleInput: string,
  initialHandle: string | undefined,
  onCheckedHandleChange?: (handle: string | undefined) => void,
) => {
  return useHandleAvailabilityCheck({
    handleInput,
    initialHandle,
    onCheckHandle: checkHandle,
    onCheckedHandleChange,
  });
};
