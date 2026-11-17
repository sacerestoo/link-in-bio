"use client";

import {
  ownPageQueryKey,
  updatePageHandle,
  useOwnPage,
} from "@/features/auth/queries";
import {
  useDebouncedHandleCheck,
  useHandleCheck,
} from "@/features/auth/ui/handle-form";
import { HandleInput } from "@/features/auth/ui/handle-input";
import { Button } from "@grabbin/ui/components/button";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactElement, type ReactNode } from "react";

export function ChangeHandleForm({
  open,
  onSaved,
}: Readonly<{
  open: boolean;
  onSaved: () => void;
}>): ReactNode {
  const page = useOwnPage(open);

  if (page.isPending || page.isError || page.data === null) {
    return <ChangeHandleQueryFeedback page={page} />;
  }

  return (
    <ChangeHandleEditor
      key={page.data.handle}
      currentHandle={page.data.handle}
      onSaved={onSaved}
    />
  );
}

function ChangeHandleQueryFeedback({
  page,
}: Readonly<{ page: ReturnType<typeof useOwnPage> }>): ReactNode {
  if (page.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  if (page.isError) {
    return (
      <div className="space-y-3">
        <p
          className="text-sm text-destructive"
          role="alert"
        >
          {page.error.message}
        </p>
        <Button
          className="w-full rounded-xl"
          onClick={() => void page.refetch()}
          pending={page.isFetching}
          variant="outline"
          size="xl"
        >
          Try again
        </Button>
      </div>
    );
  }
  if (page.data === null) {
    return (
      <p
        className="text-sm text-destructive"
        role="alert"
      >
        Page not found.
      </p>
    );
  }
  return null;
}

function useUpdatePageHandle(onSaved: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePageHandle,
    onSuccess: (handle) => {
      queryClient.setQueryData(ownPageQueryKey(), { handle });
      router.replace(`/${handle}`);
      onSaved();
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
  const mutation = useUpdatePageHandle(onSaved);
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
