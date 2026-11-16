"use client";

import type { ReactElement } from "react";
import { signOut } from "@/features/auth/api";
import { Button } from "@grabbin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@grabbin/ui/components/dropdown-menu";
import { toast } from "@grabbin/ui/components/toast";
import Settings from "lucide-react/icons/settings";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <div className="fixed inset-x-0 bottom-8 z-40 flex justify-start px-8">
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
          <Settings aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
        >
          <DropdownMenuItem
            className="h-12 px-3"
            render={<Link href="/settings" />}
          >
            Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-3"
            onClick={() => {
              void handleSignOut(() => {
                router.refresh();
              });
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
