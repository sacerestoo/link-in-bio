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
  const { handle } = useParams<{ handle: string }>();
  const { data: page } = usePage(handle);

  return (
    <ChangeHandleEditor
      key={page.handle}
      currentHandle={page.handle}
      onSaved={onSaved}
    />
  );
}

function useUpdatePageHandle(currentHandle: string, onSaved: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePageHandle,
    onSuccess: (handle) => {
      const page = queryClient.getQueryData<PageResponse>(
        pageQueryKey(currentHandle),
      );
      if (page !== undefined) {
        const updatedPage = { ...page, handle };
        queryClient.setQueryData(pageQueryKey(currentHandle), updatedPage);
        queryClient.setQueryData(pageQueryKey(handle), updatedPage);
      }
      onSaved();
      router.replace(`/${encodeURIComponent(handle)}`, { scroll: false });
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

function ChangeHandleEditor({
  currentHandle,
  onSaved,
}: Readonly<{
  currentHandle: string;
  onSaved: () => void;
}>): ReactElement {
  const [handleInput, setHandleInput] = useState(currentHandle);
  const [checkedHandle, setCheckedHandle] = useState<string | undefined>(
    currentHandle,
  );
  const { check, checking, error } = useHandleCheck();
  useDebouncedHandleCheck(handleInput, currentHandle, check, setCheckedHandle);
  const mutation = useUpdatePageHandle(currentHandle, onSaved);
  const canSave =
    checkedHandle !== undefined && checkedHandle !== currentHandle;

  return (
    <ChangeHandleFields
      canSave={canSave}
      checking={checking}
      error={checkedHandle === currentHandle ? undefined : error}
      handleInput={handleInput}
      isValid={
        checkedHandle !== undefined &&
        !checking &&
        (checkedHandle === currentHandle || error === undefined)
      }
      saving={mutation.isPending}
      onChange={(handle) => {
        setCheckedHandle(handle === currentHandle ? currentHandle : undefined);
        setHandleInput(handle);
      }}
      onSubmit={() => {
        if (canSave && !checking && !mutation.isPending && checkedHandle) {
          mutation.mutate(checkedHandle);
        }
      }}
    />
  );
}

type ChangeHandleFieldsProps = Readonly<{
  canSave: boolean;
  checking: boolean;
  error: string | undefined;
  handleInput: string;
  isValid: boolean;
  saving: boolean;
  onChange: (handle: string) => void;
  onSubmit: () => void;
}>;

function ChangeHandleFields({
  canSave,
  checking,
  error,
  handleInput,
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
        value={handleInput}
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
