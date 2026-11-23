"use client";

import type { Handle } from "@grabbin/shared/schemas/page";
import { Button } from "@grabbin/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@grabbin/ui/components/drawer";
import { Cuer } from "cuer";
import ShareIcon from "lucide-react/icons/share";
import { useParams, usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactElement } from "react";
import { usePage } from "../queries";
import { CopyProfileLinkButton } from "./copy-profile-link-button";

const subscribeToLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
};
const getLocationOrigin = () => window.location.origin;
const getServerLocationOrigin = (): undefined => undefined;

export function ShareProfileDrawer() {
  const { handle } = useParams<{ handle: Handle }>();
  const pathname = usePathname();

  return (
    <Drawer>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="rounded-full text-muted-foreground"
            aria-label="Share page"
          />
        }
      >
        <ShareIcon aria-hidden="true" />
      </DrawerTrigger>
      <DrawerContent className="gap-6 rounded-t-5xl! pb-4">
        <ShareDrawerContent
          handle={handle}
          pathname={pathname}
        />
      </DrawerContent>
    </Drawer>
  );
}

function ShareDrawerContent({
  handle,
  pathname,
}: Readonly<{
  handle: Handle;
  pathname: string;
}>): ReactElement {
  const { data: page } = usePage(handle);

  return (
    <>
      <DrawerHeader className="p-0 pb-4">
        <DrawerTitle className={"text-lg"}>Share your page</DrawerTitle>
        <DrawerDescription className={"sr-only"}>
          Scan this QR code to open your page.
        </DrawerDescription>
      </DrawerHeader>
      <ShareProfileQrCode
        imageSrc={page?.imageSrc}
        pathname={pathname}
      />
      <DrawerFooter className="mx-auto p-4">
        <CopyProfileLinkButton pathname={pathname} />
      </DrawerFooter>
    </>
  );
}

function ShareProfileQrCode({
  imageSrc,
  pathname,
}: Readonly<{
  imageSrc: string | undefined;
  pathname: string;
}>): ReactElement {
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getLocationOrigin,
    getServerLocationOrigin,
  );

  return (
    <div className="mx-auto rounded-2xl bg-white p-4">
      {origin !== undefined && origin !== "" ? (
        <Cuer
          value={`${origin}${pathname}`}
          arena={imageSrc}
          size={256}
          className="block size-64 text-black"
        />
      ) : null}
    </div>
  );
}
