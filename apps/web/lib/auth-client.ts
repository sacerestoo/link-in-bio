import { creemClient } from "@creem_io/better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/v1/auth",
  plugins: [creemClient({ persistSubscriptions: true }), emailOTPClient()],
});
