"use client";

import { Button } from "@grabbin/ui/components/button";
import { toast } from "@grabbin/ui/components/toast";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
      size="2xl"
      className="w-32 justify-center gap-2 bg-brand-green px-4 font-semibold text-background shadow-none! drop-shadow-sm hover:bg-brand-green/80! hover:text-background"
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
  const label = isCopied ? "Copied" : "Copy link";
  const prefersReducedMotion = useReducedMotion() ?? false;
  const blur = prefersReducedMotion ? "blur(0px)" : "blur(2px)";
  const transition = {
    duration: prefersReducedMotion ? 0 : 0.15,
    ease: "easeInOut" as const,
  };

  return (
    <>
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        <motion.span
          key={label}
          aria-hidden="true"
          className="inline-block"
          initial={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : 4,
            filter: blur,
          }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : -4,
            filter: blur,
          }}
          transition={transition}
        >
          {label}
        </motion.span>
      </AnimatePresence>
      <span
        aria-live="polite"
        className="sr-only"
      >
        {isCopied ? "Copied" : "Copy link"}
      </span>
    </>
  );
}
