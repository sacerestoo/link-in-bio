import { handleApiRequest } from "@/server/app";

// The only route handler under app/api: every /api/* request goes to the Hono
// app. Add API routes in server/routes/, not here.
export const GET = handleApiRequest;
export const POST = handleApiRequest;
export const PUT = handleApiRequest;
export const PATCH = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
