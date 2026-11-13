CREATE POLICY "grabbin_runtime_access" ON "account" AS PERMISSIVE FOR ALL TO "app_runtime" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "grabbin_runtime_access" ON "creem_subscription" AS PERMISSIVE FOR ALL TO "app_runtime" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "grabbin_runtime_access" ON "session" AS PERMISSIVE FOR ALL TO "app_runtime" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "grabbin_runtime_access" ON "user" AS PERMISSIVE FOR ALL TO "app_runtime" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "grabbin_runtime_access" ON "verification" AS PERMISSIVE FOR ALL TO "app_runtime" USING (true) WITH CHECK (true);
--> statement-breakpoint
GRANT CONNECT ON DATABASE neondb TO app_runtime;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "account", "creem_subscription", "session", "user", "verification" TO app_runtime;
