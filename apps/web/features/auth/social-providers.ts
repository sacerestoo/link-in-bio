import type { SocialProvider } from "./api";

export const socialProviders: ReadonlyArray<{
  id: SocialProvider;
  icon: string;
  label: string;
}> = [
  { id: "google", icon: "/google-icon.svg", label: "Google" },
  { id: "twitter", icon: "/x-icon.svg", label: "Twitter" },
  { id: "line", icon: "/line-icon.svg", label: "LINE" },
];
