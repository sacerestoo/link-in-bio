ALTER POLICY "grabbin_runtime_access" ON "account" RENAME TO "runtime_access";--> statement-breakpoint
ALTER POLICY "grabbin_runtime_access" ON "creem_subscription" RENAME TO "runtime_access";--> statement-breakpoint
ALTER POLICY "grabbin_runtime_access" ON "session" RENAME TO "runtime_access";--> statement-breakpoint
ALTER POLICY "grabbin_runtime_access" ON "user" RENAME TO "runtime_access";--> statement-breakpoint
ALTER POLICY "grabbin_runtime_access" ON "verification" RENAME TO "runtime_access";
