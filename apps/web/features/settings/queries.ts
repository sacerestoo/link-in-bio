import { api, type ApiClient } from "@/lib/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";

export type BillingSession = Awaited<ReturnType<typeof getBillingSession>>;
export type BillingSubscription = BillingSession["subscription"];
type BillingSessionQueryParams = Readonly<{
  userId: string;
  initialData: BillingSession;
  monthlyProductId?: string;
  yearlyProductId?: string;
}>;

const getBillingSession = (client: ApiClient = api) =>
  client.v1.auth.session.$get().then((response) =>
    response.json().then(({ user }) => ({
      hasAccessGranted: user.hasAccessGranted,
      subscription: user.subscription,
    })),
  );

const billingSessionRootKey = ["billing-session"] as const;
const billingSessionQueryOptions = (
  {
    userId,
    initialData,
    monthlyProductId,
    yearlyProductId,
  }: BillingSessionQueryParams,
  client: ApiClient = api,
) =>
  queryOptions({
    queryKey: billingQueries.byUserId(userId),
    queryFn: () => getBillingSession(client),
    initialData,
    select: (billing) =>
      selectBillingSession(billing, monthlyProductId, yearlyProductId),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const billingQueries = {
  all: () => billingSessionRootKey,
  byUserId: (userId: string) => [...billingQueries.all(), userId] as const,
  session: billingSessionQueryOptions,
};

export const useBillingSession = (
  params: BillingSessionQueryParams,
  client: ApiClient = api,
) => useQuery(billingSessionQueryOptions(params, client));

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

const selectBillingSession = (
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
