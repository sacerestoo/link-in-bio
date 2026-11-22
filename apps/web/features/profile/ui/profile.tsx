import type { ReactElement } from "react";
import { Field, FieldGroup } from "@grabbin/ui/components/field";
import type { ProfilePageData } from "../queries";
import { ProfileImage } from "./profile-image";
import { ProfileNameBio } from "./profile-name-bio";

export function Profile({
  handle,
}: Readonly<Pick<ProfilePageData, "handle">>): ReactElement {
  return (
    <div className="isolate flex w-full flex-col items-center page-wide:min-h-svh page-wide:flex-row page-wide:items-start page-wide:justify-around page-wide:overflow-visible">
      <main className="mx-auto flex w-full max-w-107 shrink-0 flex-col items-center justify-start overflow-visible bg-background p-6 px-6 pt-8 page-wide:sticky page-wide:top-0 page-wide:mx-0 page-wide:min-h-dvh page-wide:w-2xl page-wide:max-w-none page-wide:min-w-0 page-wide:shrink page-wide:items-start page-wide:justify-between page-wide:gap-8 page-wide:self-start page-wide:px-16 page-wide:pt-16">
        <div className="w-full min-w-0">
          <div className="mb-4 flex flex-col gap-8">
            <FieldGroup className="gap-8">
              <Field className="gap-8">
                <div className="flex w-full items-center justify-between page-wide:justify-start">
                  <ProfileImage handle={handle} />
                </div>
                <ProfileNameBio handle={handle} />
              </Field>
            </FieldGroup>
          </div>
        </div>
      </main>
      <div
        aria-hidden="true"
        className="hidden page-wide:block page-wide:w-4xl page-wide:shrink-0"
      />
    </div>
  );
}
