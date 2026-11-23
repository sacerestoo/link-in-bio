"use client";

import { PAGE_CREATED_COOKIE_NAME } from "@grabbin/shared/lib/page-created-event";
import { useEffect, useRef } from "react";

const clearPageCreatedCookie = (): void => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PAGE_CREATED_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
};

export const PageCreatedConfetti = (): null => {
  const hasHandledEvent = useRef(false);

  useEffect(() => {
    if (hasHandledEvent.current) return;
    hasHandledEvent.current = true;
    clearPageCreatedCookie();

    void import("canvas-confetti")
      .then(({ default: confetti }) =>
        confetti({
          particleCount: 320,
          scalar: 1.8,
          angle: 90,
          spread: 105,
          startVelocity: 65,
          gravity: 0.75,
          ticks: 240,
          origin: { x: 0.5, y: 1 },
          disableForReducedMotion: true,
        }),
      )
      .catch(() => {});
  }, []);

  return null;
};
