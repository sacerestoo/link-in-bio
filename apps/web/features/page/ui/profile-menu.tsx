"use client";

import type { Handle } from "@grabbin/domain/page";
import type { ReactElement } from "react";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";
import { Button } from "@grabbin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@grabbin/ui/components/dropdown-menu";
import { toast } from "@grabbin/ui/components/toast";
import Settings2 from "lucide-react/icons/settings-2";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { overlay } from "overlay-kit";
import { pageQueries } from "../queries";
import { ChangeHandleDialog } from "./change-handle-dialog";

async function handleSignOut(onRefresh: () => void): Promise<void> {
  try {
    const result = await authClient.signOut();
    if (result.error) throw new Error("Sign out failed");
    await getQueryClient().resetQueries({
      queryKey: pageQueries.byMe(),
    });
    onRefresh();
  } catch {
    toast.add({
      title: "Log out failed",
      description: "Please try again.",
      type: "error",
    });
  }
}

export function ProfileMenu(): ReactElement {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full text-muted-foreground"
          />
        }
      >
        <Settings2 aria-hidden="true" />
      </DropdownMenuTrigger>
      <ProfileMenuItems
        onChangeHandle={() => {
          overlay.open((props) => (
            <ChangeHandleDialog
              isOpen={props.isOpen}
              onClose={props.close}
              onUnmount={props.unmount}
            />
          ));
        }}
        onSignOut={() => {
          void handleSignOut(() => {
            router.refresh();
          });
        }}
      />
    </DropdownMenu>
  );
}

function ProfileMenuItems({
  onChangeHandle,
  onSignOut,
}: Readonly<{
  onChangeHandle: () => void;
  onSignOut: () => void;
}>): ReactElement {
  const { handle } = useParams<{ handle: Handle }>();

  return (
    <DropdownMenuContent
      side="top"
      align="start"
      sideOffset={8}
    >
      <DropdownMenuItem
        className="flex h-14 flex-col items-start justify-center gap-0 px-3 font-normal"
        onClick={onChangeHandle}
      >
        <span>Change handle</span>
        <span className="text-muted-foreground">/{handle}</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        className="h-12 px-3 font-normal"
        render={<Link href="/settings" />}
      >
        Account
      </DropdownMenuItem>
      <DropdownMenuItem
        className="h-12 px-3 font-normal"
        onClick={onSignOut}
      >
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
