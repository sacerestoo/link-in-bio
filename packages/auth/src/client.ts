import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({ basePath: "/v1/auth" });
