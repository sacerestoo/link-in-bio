import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  if (getSessionCookie(request) !== null) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/sign-in"] };
