"use client";

import { lazy, Suspense, type ReactElement } from "react";
import { usePage } from "../queries";
import { ProfileContent } from "./profile-content";
import { ProfileImage } from "./profile-image";

const ProfileEditor = lazy(() =>
  import("./profile-editor").then(
    ({ ProfileEditor: ProfileEditorComponent }) => ({
      default: ProfileEditorComponent,
    }),
  ),
);

export function Profile({
  handle,
}: Readonly<{ handle: string }>): ReactElement {
  const { data: page } = usePage(handle);
  const initialName = page.name ?? "";
  const initialBio = page.bio ?? "";

  const readOnlyProfile = (
    <ProfileContent
      name={initialName}
      bio={initialBio}
      image={
        <div
          aria-hidden="true"
          className="relative isolate flex size-28 items-center justify-center self-start overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground page-wide:size-46"
        >
          <ProfileImage src={page.imageUrl} />
        </div>
      }
      readOnly
    />
  );
  return (
    <div className="isolate flex min-h-svh w-full flex-col items-center page-wide:flex-row page-wide:items-start page-wide:justify-around page-wide:overflow-visible">
      <main className="mx-auto flex w-full max-w-107 shrink-0 flex-col items-center justify-start overflow-visible bg-background p-6 px-6 pt-12 page-wide:sticky page-wide:top-0 page-wide:mx-0 page-wide:min-h-dvh page-wide:w-2xl page-wide:max-w-none page-wide:min-w-0 page-wide:shrink page-wide:items-start page-wide:justify-between page-wide:gap-8 page-wide:self-start page-wide:px-16 page-wide:pt-16">
        <div className="w-full min-w-0">
          {page.isOwner ? (
            <Suspense fallback={readOnlyProfile}>
              <ProfileEditor
                key={handle}
                handle={handle}
                initialName={initialName}
                initialBio={initialBio}
              />
            </Suspense>
          ) : (
            readOnlyProfile
          )}
        </div>
      </main>
      <div
        aria-hidden="true"
        className="hidden page-wide:block page-wide:w-4xl page-wide:shrink-0"
      />
    </div>
  );
}
