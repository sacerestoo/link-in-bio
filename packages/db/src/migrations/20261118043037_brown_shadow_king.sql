ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "creem_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "auth_server_access" ON "account" CASCADE;--> statement-breakpoint
DROP POLICY "auth_server_access" ON "creem_subscription" CASCADE;--> statement-breakpoint
DROP POLICY "auth_server_access" ON "session" CASCADE;--> statement-breakpoint
DROP POLICY "auth_server_access" ON "user" CASCADE;--> statement-breakpoint
DROP POLICY "auth_server_access" ON "verification" CASCADE;