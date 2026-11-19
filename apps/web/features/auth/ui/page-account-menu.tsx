"use client";

import type { ReactElement } from "react";
import { signOut } from "@/features/auth/auth";
import { ChangeHandleDialog } from "@/features/auth/ui/change-handle-dialog";
import { usePage } from "@/features/profile/queries";
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

async function handleSignOut(refresh: () => void): Promise<void> {
  try {
    const result = await signOut();
    if (result.error) throw new Error("Sign out failed");
    refresh();
  } catch {
    toast.add({
      title: "Log out failed",
      description: "Please try again.",
      type: "error",
    });
  }
}

export function PageAccountMenu(): ReactElement {
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
      <PageAccountMenuItems
        onChangeHandle={() => {
          overlay.open((props) => <ChangeHandleDialog {...props} />);
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

function PageAccountMenuItems({
  onChangeHandle,
  onSignOut,
}: Readonly<{
  onChangeHandle: () => void;
  onSignOut: () => void;
}>): ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const { data: page } = usePage(handle);

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
        <span className="text-muted-foreground">/{page.handle}</span>
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
