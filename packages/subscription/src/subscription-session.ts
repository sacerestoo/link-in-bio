import "server-only";
import { customSession } from "better-auth/plugins/custom-session";
type CreemSubscription = Readonly<{
  productId: string;
  status: string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean | null;
}>;

const hasSubscriptionAccess = (
  subscription: CreemSubscription,
  now: number,
): boolean => {
  const status = subscription.status.toLowerCase();
  if (["active", "trialing", "paid"].includes(status)) return true;
  return (
    ["scheduled_cancel", "past_due", "unpaid"].includes(status) &&
    subscription.periodEnd !== null &&
    (subscription.periodEnd instanceof Date
      ? subscription.periodEnd.getTime()
      : new Date(subscription.periodEnd).getTime()) > now
  );
};

const toPublicSubscription = ({
  productId,
  status,
  periodStart,
  periodEnd,
  cancelAtPeriodEnd,
}: CreemSubscription) => ({
  productId,
  status,
  periodStart,
  periodEnd,
  cancelAtPeriodEnd,
});

export const createBillingSessionPlugin = (creemEnabled: boolean) =>
  customSession(async ({ session, user }, ctx) => {
    const subscriptions = creemEnabled
      ? await ctx.context.adapter.findMany<CreemSubscription>({
          model: "creem_subscription",
          where: [{ field: "referenceId", value: user.id }],
          sortBy: { field: "periodStart", direction: "desc" },
        })
      : [];
    subscriptions.sort(
      (left, right) =>
        Number(left.periodStart === null) - Number(right.periodStart === null),
    );
    const currentSubscription = subscriptions.find((subscription) =>
      hasSubscriptionAccess(subscription, Date.now()),
    );
    const selectedSubscription = currentSubscription ?? subscriptions[0];

    return {
      session,
      user: {
        ...user,
        hasAccessGranted: currentSubscription !== undefined,
        subscription:
          selectedSubscription === undefined
            ? null
            : toPublicSubscription(selectedSubscription),
        subscriptions: subscriptions.map((subscription) =>
          toPublicSubscription(subscription),
        ),
      },
    };
  });
