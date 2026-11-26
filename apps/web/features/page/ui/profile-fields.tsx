import type { ReactElement } from "react";
import {
  PAGE_BIO_MAX_LENGTH,
  PAGE_NAME_MAX_LENGTH,
} from "@grabbin/domain/page";
import {
  InputGroup,
  InputGroupTextarea,
} from "@grabbin/ui/components/input-group";
import type { ProfilePageData } from "../queries";

type ProfileFieldValues = Readonly<Pick<ProfilePageData, "name" | "bio">>;
type ProfileFieldsProps = ProfileFieldValues &
  Readonly<{
    readOnly: boolean;
    onNameChange?: (value: ProfileFieldValues["name"]) => void;
    onBioChange?: (value: ProfileFieldValues["bio"]) => void;
  }>;

function ProfileNameField({
  value,
  onChange,
  readOnly,
}: Readonly<{
  value: ProfileFieldValues["name"];
  onChange?: (value: ProfileFieldValues["name"]) => void;
  readOnly: boolean;
}>): ReactElement {
  return (
    <InputGroup className="h-auto rounded-none shadow-none focus-within:ring-0! hover:bg-inherit has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
      <InputGroupTextarea
        id="page-name"
        name="name"
        aria-label="Name"
        spellCheck={false}
        autoComplete="name"
        maxLength={PAGE_NAME_MAX_LENGTH}
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
  value: ProfileFieldValues["bio"];
  onChange?: (value: ProfileFieldValues["bio"]) => void;
  readOnly: boolean;
}>): ReactElement {
  return (
    <InputGroup className="h-auto rounded-none shadow-none focus-within:ring-0! hover:bg-inherit has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
      <InputGroupTextarea
        id="page-bio"
        name="bio"
        aria-label="Bio"
        spellCheck={false}
        maxLength={PAGE_BIO_MAX_LENGTH}
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

export function ProfileFields({
  name,
  bio,
  readOnly,
  onNameChange,
  onBioChange,
}: ProfileFieldsProps): ReactElement {
  return (
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
  );
}
