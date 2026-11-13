import { useSyncExternalStore } from "react";

const mobileQuery = `(max-width: ${String(768 - 1)}px)`;

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return (): void => {
    query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(mobileQuery).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export const useIsMobile = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
