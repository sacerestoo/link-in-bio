import { authClient } from "@grabbin/auth/client";

export const updateUserName = (name: string) => authClient.updateUser({ name });

export const requestAccountDeletion = (callbackURL: string) =>
  authClient.deleteUser({ callbackURL });
