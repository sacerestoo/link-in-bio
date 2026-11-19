import type { ReactElement } from "react";
import { Field, FieldGroup } from "@grabbin/ui/components/field";
import {
  InputGroup,
  InputGroupTextarea,
} from "@grabbin/ui/components/input-group";

function ProfileNameField({
  value,
  onChange,
  readOnly,
}: Readonly<{
  value: string;
  onChange?: (value: string) => void;
  readOnly: boolean;
}>): ReactElement {
  return (
    <InputGroup className="h-auto rounded-none shadow-none focus-within:ring-0! hover:bg-inherit has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
      <InputGroupTextarea
        id="page-name"
        name="name"
        aria-label="Name"
        autoComplete="name"
        maxLength={50}
        rows={1}
        placeholder={readOnly ? undefined : "Name"}
        readOnly={readOnly}
        value={value}
        onChange={(event) => {
          onChange?.(event.currentTarget.value);
        }}
        className="field-sizing-content min-h-fit! w-full max-w-full min-w-0 border-0! bg-transparent! p-0! pr-1! text-profile-name! leading-tight font-bold tracking-tight wrap-break-word whitespace-pre-wrap transition-[background-color,box-shadow] duration-150 ease-out outline-none page-wide:text-profile-name-desktop!"
      />
    </InputGroup>
  );
}

function ProfileBioField({
  value,
  onChange,
  readOnly,
}: Readonly<{
  value: string;
  onChange?: (value: string) => void;
  readOnly: boolean;
}>): ReactElement {
  return (
    <InputGroup className="h-auto rounded-none shadow-none focus-within:ring-0! hover:bg-inherit has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
      <InputGroupTextarea
        id="page-bio"
        name="bio"
        aria-label="Bio"
        rows={2}
        placeholder={readOnly ? undefined : "Tell about you"}
        readOnly={readOnly}
        value={value}
        onChange={(event) => {
          onChange?.(event.currentTarget.value);
        }}
        className="field-sizing-content min-h-fit! w-full overflow-hidden border-0! bg-transparent! px-0.5! text-base! leading-6 tracking-normal whitespace-pre-wrap text-primary/70 transition-[background-color,box-shadow] duration-150 ease-out outline-none page-wide:text-xl! page-wide:leading-8 page-wide:tracking-tight"
      />
    </InputGroup>
  );
}

export function ProfileContent({
  name,
  bio,
  image,
  readOnly,
  onNameChange,
  onBioChange,
}: Readonly<{
  name: string;
  bio: string;
  image: ReactElement;
  readOnly: boolean;
  onNameChange?: (value: string) => void;
  onBioChange?: (value: string) => void;
}>): ReactElement {
  return (
    <div className="mb-4 flex flex-col gap-8">
      <FieldGroup className="gap-8">
        <Field className="gap-8">
          <div className="flex w-full items-center justify-between page-wide:justify-start">
            {image}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <ProfileNameField
              value={name}
              onChange={onNameChange}
              readOnly={readOnly}
            />
            <ProfileBioField
              value={bio}
              onChange={onBioChange}
              readOnly={readOnly}
            />
          </div>
        </Field>
      </FieldGroup>
    </div>
  );
}
