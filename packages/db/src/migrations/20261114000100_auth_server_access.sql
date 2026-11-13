ALTER POLICY "runtime_access" ON "account" RENAME TO "auth_server_access";--> statement-breakpoint
ALTER POLICY "runtime_access" ON "creem_subscription" RENAME TO "auth_server_access";--> statement-breakpoint
ALTER POLICY "runtime_access" ON "session" RENAME TO "auth_server_access";--> statement-breakpoint
ALTER POLICY "runtime_access" ON "user" RENAME TO "auth_server_access";--> statement-breakpoint
ALTER POLICY "runtime_access" ON "verification" RENAME TO "auth_server_access";
