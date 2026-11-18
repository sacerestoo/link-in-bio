import { api } from "@/lib/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";

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
    select: (billing) =>
      selectBillingSession(billing, monthlyProductId, yearlyProductId),
  });

export const useBillingSession = ({
  userId,
  initialData,
  monthlyProductId,
  yearlyProductId,
}: Readonly<{
  userId: string;
  initialData: BillingSession;
  monthlyProductId?: string;
  yearlyProductId?: string;
}>) => {
  return useQuery({
    ...billingSessionQueryOptions({
      userId,
      initialData,
      monthlyProductId,
      yearlyProductId,
    }),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      : new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(periodEnd);
  const isScheduledToCancel =
    subscription.cancelAtPeriodEnd === true ||
    subscription.status === "scheduled_cancel";
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

  return `${planName}${periodDescription}`;
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
