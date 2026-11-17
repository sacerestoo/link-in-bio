import { authClient } from "@/lib/auth-client";

type BillingResponse = Readonly<{
  data: Readonly<{ url: string }> | null;
  error: Readonly<{ message: string }> | null;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createBillingRequest = async (
  path: string,
  body: Readonly<{ productId?: string }>,
): Promise<BillingResponse> => {
  const result = await authClient.$fetch(path, {
    method: "POST",
    body,
  });
  if (result.error !== null) {
    return {
      data: null,
      error: { message: result.error.message ?? "Billing request failed." },
    };
  }
  if (!isRecord(result.data) || typeof result.data.url !== "string") {
    return {
      data: null,
      error: { message: "Creem did not return a billing URL." },
    };
  }
  return { data: { url: result.data.url }, error: null };
};

export const updateUserName = (name: string) => authClient.updateUser({ name });

export const requestAccountDeletion = (callbackURL: string) =>
  authClient.deleteUser({ callbackURL });

export const createBillingCheckout = (productId: string) =>
  createBillingRequest("/creem/create-checkout", { productId });

export const createBillingPortal = () =>
  createBillingRequest("/creem/create-portal", {});
