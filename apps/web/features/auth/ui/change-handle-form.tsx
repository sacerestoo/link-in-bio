"use client";

import type { PageResponse } from "@grabbin/shared/schemas/page";
import {
  pageQueryKey,
  updatePageHandle,
  usePage,
} from "@/features/auth/queries";
import {
  useDebouncedHandleCheck,
  useHandleCheck,
} from "@/features/auth/ui/handle-form";
import { HandleInput } from "@/features/auth/ui/handle-input";
import { Button } from "@grabbin/ui/components/button";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactElement, type ReactNode } from "react";

export function ChangeHandleForm({
  onSaved,
}: Readonly<{
  onSaved: () => void;
}>): ReactNode {
  const { handle: routeHandle } = useParams<{ handle: string }>();
  const { data: page } = usePage(routeHandle);
  const userOwnedHandle = page.handle;

  return (
    <ChangeHandleEditor
      key={userOwnedHandle}
      currentHandle={userOwnedHandle}
      onSaved={onSaved}
    />
  );
}

function useUpdatePageHandle(currentHandle: string, onSaved: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestedHandle: string) =>
      updatePageHandle(currentHandle, requestedHandle),
    onSuccess: (updatedHandle) => {
      const page = queryClient.getQueryData<PageResponse>(
        pageQueryKey(currentHandle),
      );
      if (page !== undefined) {
        const updatedPage = { ...page, handle: updatedHandle };
        queryClient.setQueryData(pageQueryKey(currentHandle), updatedPage);
        queryClient.setQueryData(pageQueryKey(updatedHandle), updatedPage);
      }
      onSaved();
      router.replace(`/${encodeURIComponent(updatedHandle)}`, {
        scroll: false,
      });
    },
    onError: (cause) => {
      toast.add({
        title: "Handle change failed",
        description:
          cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
      });
    },
  });
}

function useRequestedHandle(currentHandle: string) {
  const [requestedHandleInput, setRequestedHandleInput] =
    useState(currentHandle);
  const [validatedRequestedHandle, setValidatedRequestedHandle] = useState<
    string | undefined
  >(currentHandle);
  const { check, checking, error } = useHandleCheck();
  useDebouncedHandleCheck(
    requestedHandleInput,
    currentHandle,
    check,
    setValidatedRequestedHandle,
  );
  const onChange = (requestedHandle: string) => {
    setValidatedRequestedHandle(
      requestedHandle === currentHandle ? currentHandle : undefined,
    );
    setRequestedHandleInput(requestedHandle);
  };

  return {
    requestedHandleInput,
    validatedRequestedHandle,
    checking,
    error,
    onChange,
  };
}

function ChangeHandleEditor({
  currentHandle,
  onSaved,
}: Readonly<{
  currentHandle: string;
  onSaved: () => void;
}>): ReactElement {
  const {
    requestedHandleInput,
    validatedRequestedHandle,
    checking,
    error,
    onChange,
  } = useRequestedHandle(currentHandle);
  const mutation = useUpdatePageHandle(currentHandle, onSaved);
  const requestedHandleIsCurrent = validatedRequestedHandle === currentHandle;
  const canSave =
    validatedRequestedHandle !== undefined && !requestedHandleIsCurrent;
  const isValid =
    validatedRequestedHandle !== undefined &&
    !checking &&
    (requestedHandleIsCurrent || error === undefined);

  return (
    <ChangeHandleFields
      canSave={canSave}
      checking={checking}
      error={requestedHandleIsCurrent ? undefined : error}
      requestedHandleInput={requestedHandleInput}
      isValid={isValid}
      saving={mutation.isPending}
      onChange={onChange}
      onSubmit={() => {
        if (
          canSave &&
          !checking &&
          !mutation.isPending &&
          validatedRequestedHandle
        ) {
          mutation.mutate(validatedRequestedHandle);
        }
      }}
    />
  );
}

type ChangeHandleFieldsProps = Readonly<{
  canSave: boolean;
  checking: boolean;
  error: string | undefined;
  requestedHandleInput: string;
  isValid: boolean;
  saving: boolean;
  onChange: (requestedHandle: string) => void;
  onSubmit: () => void;
}>;

function ChangeHandleFields({
  canSave,
  checking,
  error,
  requestedHandleInput,
  isValid,
  saving,
  onChange,
  onSubmit,
}: ChangeHandleFieldsProps): ReactElement {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <HandleInput
        checking={checking}
        error={error}
        isValid={isValid}
        onChange={onChange}
        value={requestedHandleInput}
      />
      <div className="flex justify-end">
        <Button
          disabled={!canSave || checking || saving}
          pending={saving}
          type="submit"
          variant="outline"
          size="lg"
        >
          Change
        </Button>
      </div>
    </form>
  );
}
