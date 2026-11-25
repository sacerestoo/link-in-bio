"use client";

import type { ReactNode } from "react";
import { FieldError } from "@grabbin/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import CircleCheck from "lucide-react/icons/circle-check";

export function HandleInput({
  value,
  error,
  checking,
  isValid,
  onChange,
}: Readonly<{
  value: string;
  error: string | undefined;
  checking: boolean;
  isValid: boolean;
  onChange: (value: string) => void;
}>): ReactNode {
  return (
    <div className="space-y-2">
      <Label
        className="sr-only"
        htmlFor="page-handle"
      >
        Page handle
      </Label>
      <HandleInputControl
        checking={checking}
        error={error}
        isValid={isValid}
        onChange={onChange}
        value={value}
      />
      {error !== undefined && (
        <FieldError
          id="handle-error"
          className="text-xs"
        >
          {error}
        </FieldError>
      )}
    </div>
  );
}

function HandleInputControl({
  value,
  error,
  checking,
  isValid,
  onChange,
}: Readonly<{
  value: string;
  error: string | undefined;
  checking: boolean;
  isValid: boolean;
  onChange: (value: string) => void;
}>): ReactNode {
  return (
    <InputGroup
      size="2xl"
      variant="flat"
    >
      <InputGroupInput
        autoCapitalize="none"
        autoComplete="off"
        aria-describedby={error === undefined ? undefined : "handle-error"}
        aria-invalid={error !== undefined}
        id="page-handle"
        maxLength={30}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="your-name"
        className="text-sm"
        value={value}
      />
      <HandleStatusAddon
        checking={checking}
        isValid={isValid}
      />
    </InputGroup>
  );
}

function HandleStatusAddon({
  checking,
  isValid,
}: Readonly<{ checking: boolean; isValid: boolean }>): ReactNode {
  if (!checking && !isValid) return null;

  return (
    <InputGroupAddon align="inline-end">
      {checking ? (
        <Loading className="size-4" />
      ) : (
        <span
          aria-hidden="true"
          className="auth-success"
        >
          <CircleCheck className="size-5" />
        </span>
      )}
    </InputGroupAddon>
  );
}
