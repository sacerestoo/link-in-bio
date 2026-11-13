import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type ClassName = string | null | undefined;

export const cn = (...inputs: readonly ClassName[]): string =>
  twMerge(clsx(...inputs));

export type DateFormatVariant = "date" | "relative";

export const formatDate = (
  value: Date | string,
  variant: DateFormatVariant = "date",
): string => {
  const date = typeof value === "string" ? new Date(value) : value;

  if (variant === "date") {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  const today = new Date();
  const dateDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const todayDay = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const days = Math.round((dateDay - todayDay) / 86_400_000);
  const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "always" });

  if (Math.abs(days) < 2) {
    return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(
      days,
      "day",
    );
  }
  if (Math.abs(days) < 7) return relative.format(days, "day");
  if (Math.abs(days) < 30) return relative.format(Math.round(days / 7), "week");
  if (Math.abs(days) < 365)
    return relative.format(Math.round(days / 30), "month");
  return relative.format(Math.round(days / 365), "year");
};
