import { api } from "@/lib/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export type BillingSession = Awaited<ReturnType<typeof getBillingSession>>;
export type BillingSubscription = BillingSession["subscription"];

export const getBillingSession = () =>
  api.v1.auth.session.$get().then((response) =>
    response.json().then(({ user }) => ({
      hasAccessGranted: user.hasAccessGranted,
      subscription: user.subscription,
    })),
  );

export const billingSessionQueryKey = (userId: string) =>
  ["billing-session", userId] as const;

export const billingSessionQueryOptions = ({
  userId,
  initialData,
  monthlyProductId,
  yearlyProductId,
}: Readonly<{
  userId: string;
  initialData: BillingSession;
  monthlyProductId?: string;
  yearlyProductId?: string;
}>) =>
  queryOptions({
    queryKey: billingSessionQueryKey(userId),
    queryFn: getBillingSession,
    initialData,
    staleTime: 0,
    select: (billing) =>
      selectBillingSession(billing, monthlyProductId, yearlyProductId),
  });

export const useBillingSession = ({
  userId,
  initialData,
  checkoutReturn,
  monthlyProductId,
  yearlyProductId,
}: Readonly<{
  userId: string;
  initialData: BillingSession;
  checkoutReturn: boolean;
  monthlyProductId?: string;
  yearlyProductId?: string;
}>) => {
  const pollingStartedAt = useRef<number | null>(null);

  useEffect(() => {
    pollingStartedAt.current = checkoutReturn ? Date.now() : null;
  }, [checkoutReturn]);

  return useQuery({
    ...billingSessionQueryOptions({
      userId,
      initialData,
      monthlyProductId,
      yearlyProductId,
    }),
    enabled: (query) =>
      checkoutReturn &&
      !initialData.hasAccessGranted &&
      query.state.data?.hasAccessGranted !== true,
    refetchOnMount: true,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (
        query.state.error !== null ||
        query.state.data?.hasAccessGranted === true ||
        (pollingStartedAt.current !== null &&
          Date.now() - pollingStartedAt.current >= 30_000)
      ) {
        return false;
      }
      return 1500;
    },
  });
};

function getPlanDescription(
  subscription: BillingSubscription,
  active: boolean,
  monthlyProductId?: string,
  yearlyProductId?: string,
): string {
  if (subscription === null) return "Upgrade to use full features.";

  const interval =
    subscription.productId === monthlyProductId
      ? "Monthly"
      : subscription.productId === yearlyProductId
        ? "Yearly"
        : "Pro";
  const periodEnd =
    subscription.periodEnd === null
      ? undefined
      : new Date(subscription.periodEnd);
  const formattedPeriodEnd =
    periodEnd === undefined || Number.isNaN(periodEnd.getTime())
      ? undefined
      : new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(periodEnd);
  const isScheduledToCancel =
    subscription.cancelAtPeriodEnd === true ||
    subscription.status === "scheduled_cancel";
  const status = isScheduledToCancel
    ? "Cancels at period end"
    : subscription.status.charAt(0).toUpperCase() +
      subscription.status.slice(1);
  const periodDescription =
    formattedPeriodEnd === undefined
      ? "."
      : active && isScheduledToCancel
        ? ` through ${formattedPeriodEnd}.`
        : active
          ? ` · Renews ${formattedPeriodEnd}.`
          : ` · Period end: ${formattedPeriodEnd}.`;
  const planName = active
    ? interval
    : `Latest ${interval.toLowerCase()} subscription`;

  return `${planName} · ${status}${periodDescription}`;
}

export const selectBillingSession = (
  billing: BillingSession,
  monthlyProductId?: string,
  yearlyProductId?: string,
) => ({
  ...billing,
  planDescription: getPlanDescription(
    billing.subscription,
    billing.hasAccessGranted,
    monthlyProductId,
    yearlyProductId,
  ),
});
