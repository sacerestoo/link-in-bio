"use client";

import type { authClient } from "@grabbin/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@grabbin/ui/components/avatar";
import { Button } from "@grabbin/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@grabbin/ui/components/field";
import {
  InputGroup,
  InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Separator } from "@grabbin/ui/components/separator";
import { NameField } from "./name-field";

export function AccountManagement({
  user,
}: Readonly<{
  user: Pick<typeof authClient.$Infer.Session.user, "name" | "email" | "image">;
}>) {
  return (
    <div className="space-y-6">
      <AvatarField user={user} />
      <NameField initialName={user.name} />
      <EmailField email={user.email} />
      <PasswordField />
      <DeleteAccountField />
    </div>
  );
}

function AvatarField({
  user,
}: {
  user: Pick<typeof authClient.$Infer.Session.user, "name" | "email" | "image">;
}) {
  return (
    <Field className="rounded-2xl shadow-default">
      <FieldLabel className="p-4 pb-2 text-base">Avatar</FieldLabel>
      <div className="flex items-center gap-3 px-4 pb-4">
        <Avatar
          className="size-24 flex-none overflow-hidden bg-muted"
          outline={false}
        >
          {user.image !== undefined && user.image !== null && (
            <AvatarImage
              src={user.image}
              alt={user.name}
              className="profile-image-outline"
            />
          )}
          <AvatarFallback />
        </Avatar>
      </div>
    </Field>
  );
}

function EmailField({ email }: { email: string }) {
  return (
    <Field className="rounded-2xl shadow-default">
      <FieldLabel
        htmlFor="email"
        className="p-4 pb-2 text-base"
      >
        Email
      </FieldLabel>
      <div className="px-4 pb-2">
        <InputGroup
          size="xl"
          variant="flat"
        >
          <InputGroupInput
            id="email"
            type="email"
            value={email}
            disabled
            readOnly
          />
        </InputGroup>
      </div>
      <Separator size="a" />
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <FieldDescription className="p-0 text-xs">
          Changing email is not allowed yet.
        </FieldDescription>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full px-3"
          disabled
        >
          Update
        </Button>
      </div>
    </Field>
  );
}

function PasswordField() {
  return (
    <Field className="rounded-2xl shadow-default">
      <FieldLabel
        htmlFor="password-mask"
        className="p-4 pb-2 text-base"
      >
        Password
      </FieldLabel>
      <div className="px-4 pb-2">
        <InputGroup
          size="xl"
          variant="flat"
        >
          <InputGroupInput
            id="password-mask"
            value="********"
            readOnly
            disabled
            className="cursor-default pt-2 text-base text-muted-foreground disabled:opacity-100"
            tabIndex={-1}
          />
        </InputGroup>
      </div>
      <Separator size="a" />
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <FieldDescription className="p-0 text-xs">
          OAuth accounts cannot change passwords.
        </FieldDescription>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full px-3"
          disabled
        >
          Update
        </Button>
      </div>
    </Field>
  );
}

function DeleteAccountField() {
  return (
    <Field className="rounded-2xl shadow-default">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="space-y-1">
          <FieldLabel className="text-base">Delete account</FieldLabel>
          <FieldDescription className="text-sm">
            Permanently delete your account and all of its data. This action
            cannot be undone.
          </FieldDescription>
        </div>
        <Button
          type="button"
          variant="danger"
          size="lg"
          className="shrink-0 rounded-full px-3"
          disabled
          title="Account deletion is not available yet."
        >
          Delete
        </Button>
      </div>
    </Field>
  );
}
