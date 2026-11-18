import {
  createBillingCheckout,
  createBillingPortal,
} from "@/features/settings/api";
import { useState } from "react";
import { type BillingSubscription, useBillingSession } from "../queries";

type BillingAction = "upgrade" | "portal" | null;
type BillingResult = Awaited<ReturnType<typeof createBillingCheckout>>;

export type BillingManagementProps = Readonly<{
  userId: string;
  hasAccessGranted: boolean;
  subscription: BillingSubscription;
  monthlyProductId?: string;
  yearlyProductId?: string;
}>;

export const useBillingManagement = ({
  userId,
  hasAccessGranted,
  subscription,
  monthlyProductId,
  yearlyProductId,
}: BillingManagementProps) => {
  const checkoutReturn =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("checkout") === "success";
  const billing = useBillingSession({
    userId,
    initialData: { hasAccessGranted, subscription },
    monthlyProductId,
    yearlyProductId,
  });
  const actions = useBillingActions(monthlyProductId);
  const billingError =
    checkoutReturn && !hasAccessGranted && billing.error !== null
      ? getErrorMessage(billing.error, "Could not load billing details.")
      : undefined;

  return {
    ...billing.data,
    action: actions.action,
    error: billingError ?? actions.error,
    openPortal: actions.openPortal,
    startUpgrade: actions.startUpgrade,
  };
};

const runBillingAction = async (
  action: Exclude<BillingAction, null>,
  request: () => Promise<BillingResult>,
  setAction: (action: BillingAction) => void,
  setError: (error: string | undefined) => void,
  fallback: string,
): Promise<void> => {
  setAction(action);
  setError(undefined);
  try {
    const { data, error } = await request();
    if (error !== null) throw new Error(error.message);
    if (data?.url !== undefined) window.location.assign(data.url);
  } catch (cause: unknown) {
    setError(getErrorMessage(cause, fallback));
  } finally {
    setAction(null);
  }
};

function useBillingActions(monthlyProductId: string | undefined) {
  const [action, setAction] = useState<BillingAction>(null);
  const [error, setError] = useState<string>();

  const startUpgrade = () =>
    runBillingAction(
      "upgrade",
      () => {
        if (monthlyProductId === undefined) {
          throw new Error("Upgrade is currently unavailable.");
        }
        return createBillingCheckout(monthlyProductId);
      },
      setAction,
      setError,
      "Could not start checkout.",
    );
  const openPortal = () =>
    runBillingAction(
      "portal",
      createBillingPortal,
      setAction,
      setError,
      "Could not open billing.",
    );

  return { action, error, startUpgrade, openPortal };
}

const getErrorMessage = (cause: unknown, fallback: string): string =>
  cause instanceof Error ? cause.message : fallback;
