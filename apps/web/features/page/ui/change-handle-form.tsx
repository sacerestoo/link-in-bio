"use client";

import { Button } from "@grabbin/ui/components/button";
import { HandleInput } from "@grabbin/ui/components/handle-input";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { useParams } from "next/navigation";
import { type ReactElement, type ReactNode } from "react";
import { useChangeHandleFormState } from "../hooks/use-change-handle-form-state";
import { useUpdatePageHandle } from "../hooks/use-update-page-handle";
import { usePage } from "../queries";

export function ChangeHandleForm({
  onSaved,
}: Readonly<{
  onSaved: () => void;
}>): ReactNode {
  const { handle: routeHandle } = useParams<{ handle: string }>();
  const { data: page } = usePage(routeHandle);
  if (page === undefined) return <Skeleton className="h-11 w-full" />;

  const userOwnedHandle = page.handle;

  return (
    <ChangeHandleEditor
      key={userOwnedHandle}
      currentHandle={userOwnedHandle}
      onSaved={onSaved}
    />
  );
}

function ChangeHandleEditor({
  currentHandle,
  onSaved,
}: Readonly<{
  currentHandle: string;
  onSaved: () => void;
}>): ReactElement {
  const { requestedHandleInput, canSave, checking, error, isValid, onChange } =
    useChangeHandleFormState(currentHandle);
  const mutation = useUpdatePageHandle(currentHandle, onSaved);

  return (
    <ChangeHandleFields
      canSave={canSave}
      checking={checking}
      error={error}
      requestedHandleInput={requestedHandleInput}
      isValid={isValid}
      saving={mutation.isPending}
      onChange={onChange}
      onSubmit={() => {
        if (canSave && !checking && !mutation.isPending) {
          mutation.mutate(requestedHandleInput);
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
