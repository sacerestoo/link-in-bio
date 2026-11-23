"use client";

import { Button } from "@grabbin/ui/components/button";
import { toast } from "@grabbin/ui/components/toast";
import { cn } from "@grabbin/ui/lib/utils";
import CheckIcon from "lucide-react/icons/check";
import CopyIcon from "lucide-react/icons/copy";
import { useEffect, useRef, useState } from "react";

export function CopyProfileLinkButton({
  pathname,
}: Readonly<{ pathname: string }>) {
  const [isCopied, setIsCopied] = useState(false);
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current !== null)
        clearTimeout(copyResetTimeout.current);
    };
  }, []);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${pathname}`,
      );
      setIsCopied(true);
      if (copyResetTimeout.current !== null)
        clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      toast.add({
        title: "Couldn't copy link",
        description: "Please try again.",
        type: "error",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2"
      onClick={() => {
        void handleCopy();
      }}
    >
      <CopyProfileLinkButtonContent isCopied={isCopied} />
    </Button>
  );
}

function CopyProfileLinkButtonContent({
  isCopied,
}: Readonly<{ isCopied: boolean }>) {
  return (
    <>
      <span
        aria-hidden="true"
        className="relative"
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]",
            isCopied
              ? "blur-0 scale-100 opacity-100"
              : "scale-[0.25] opacity-0 blur-xs",
          )}
        >
          <CheckIcon />
        </span>
        <span
          className={cn(
            "transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]",
            isCopied
              ? "scale-[0.25] opacity-0 blur-xs"
              : "blur-0 scale-100 opacity-100",
          )}
        >
          <CopyIcon />
        </span>
      </span>
      <span
        aria-hidden="true"
        className="relative grid"
      >
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]",
            isCopied
              ? "blur-0 scale-100 opacity-100"
              : "scale-[0.25] opacity-0 blur-xs",
          )}
        >
          Copied link
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]",
            isCopied
              ? "scale-[0.25] opacity-0 blur-xs"
              : "blur-0 scale-100 opacity-100",
          )}
        >
          Copy link
        </span>
      </span>
      <span
        aria-live="polite"
        className="sr-only"
      >
        {isCopied ? "Copied link" : "Copy link"}
      </span>
    </>
  );
}
