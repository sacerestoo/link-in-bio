"use client";

import { updateUserName } from "@/features/settings/api";
import { Button } from "@grabbin/ui/components/button";
import { Field, FieldLabel } from "@grabbin/ui/components/field";
import {
  InputGroup,
  InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Separator } from "@grabbin/ui/components/separator";
import { useEffect, useState, type SubmitEvent } from "react";

export function NameField({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [updated, setUpdated] = useState(false);
  const [pending, setPending] = useState(false);
  useSuccessReset(updated, setUpdated);
  async function updateName(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    setError(undefined);
    if (nextName.length === 0 || nextName.length > 30) {
      setError("Enter a name of 30 characters or fewer.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await updateUserName(nextName);
      if (updateError) throw new Error(updateError.message);
      setName(nextName);
      setSavedName(nextName);
      setUpdated(true);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Profile update failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <NameForm
      name={name}
      savedName={savedName}
      error={error}
      updated={updated}
      pending={pending}
      onNameChange={(value) => {
        setName(value);
        setError(undefined);
        setUpdated(false);
      }}
      onSubmit={(event) => void updateName(event)}
    />
  );
}

function useSuccessReset(
  updated: boolean,
  onUpdatedChange: (updated: boolean) => void,
) {
  useEffect(() => {
    const timeout = updated
      ? window.setTimeout(() => {
          onUpdatedChange(false);
        }, 4000)
      : undefined;
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [updated, onUpdatedChange]);
}

function NameForm({
  name,
  savedName,
  error,
  updated,
  pending,
  onNameChange,
  onSubmit,
}: {
  name: string;
  savedName: string;
  error?: string;
  updated: boolean;
  pending: boolean;
  onNameChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Field
        className="rounded-2xl shadow-default"
        data-invalid={error !== undefined}
      >
        <NameInput
          name={name}
          pending={pending}
          error={error}
          onNameChange={onNameChange}
        />
        <NameActions
          name={name}
          savedName={savedName}
          error={error}
          updated={updated}
          pending={pending}
        />
      </Field>
    </form>
  );
}

function NameInput({
  name,
  pending,
  error,
  onNameChange,
}: {
  name: string;
  pending: boolean;
  error?: string;
  onNameChange: (value: string) => void;
}) {
  return (
    <>
      <FieldLabel
        htmlFor="full-name"
        className="p-4 pb-2 text-base"
      >
        Full name
      </FieldLabel>
      <div className="px-4 pb-2">
        <InputGroup
          size="xl"
          variant="flat"
        >
          <InputGroupInput
            id="full-name"
            name="name"
            autoComplete="off"
            maxLength={30}
            value={name}
            disabled={pending}
            aria-invalid={error !== undefined}
            onChange={(event) => {
              onNameChange(event.currentTarget.value);
            }}
          />
        </InputGroup>
      </div>
      <Separator size="a" />
    </>
  );
}

function NameActions({
  name,
  savedName,
  error,
  updated,
  pending,
}: {
  name: string;
  savedName: string;
  error?: string;
  updated: boolean;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2">
      <p
        className={
          error !== undefined && error.length > 0
            ? "text-xs text-destructive"
            : updated
              ? "text-xs text-brand"
              : "text-xs text-muted-foreground"
        }
        role={error === undefined ? "status" : "alert"}
      >
        {error ??
          (updated
            ? "Full name has been updated successfully."
            : "Maximum of 30 characters")}
      </p>
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="rounded-full px-3"
        disabled={name === savedName || pending}
        pending={pending}
      >
        Update
      </Button>
    </div>
  );
}
