"use client";

import type { ReactElement } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQueries } from "../queries";
import { ProfileEditor } from "./profile-editor";

export function Profile({
  handle,
}: Readonly<{ handle: string }>): ReactElement {
  const { data: page } = useSuspenseQuery(profileQueries.detail(handle));

  return (
    <div className="isolate flex min-h-svh w-full flex-col items-center page-wide:flex-row page-wide:items-start page-wide:justify-around page-wide:overflow-visible">
      <main className="mx-auto flex w-full max-w-107 shrink-0 flex-col items-center justify-start overflow-visible bg-background p-6 px-6 pt-12 page-wide:sticky page-wide:top-0 page-wide:mx-0 page-wide:min-h-dvh page-wide:w-2xl page-wide:max-w-none page-wide:min-w-0 page-wide:shrink page-wide:items-start page-wide:justify-between page-wide:gap-8 page-wide:self-start page-wide:px-16 page-wide:pt-16">
        <div className="w-full min-w-0">
          <ProfileEditor
            initialName={page.name ?? ""}
            initialBio={page.bio ?? ""}
            initialImageUrl={page.imageUrl}
            readOnly={!page.isOwner}
          />
        </div>
      </main>
      <div
        aria-hidden="true"
        className="hidden page-wide:block page-wide:w-4xl page-wide:shrink-0"
      />
    </div>
  );
}
