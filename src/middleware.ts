import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generateRequestId } from "@/lib/observability/request-context";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const publicRoutes = ["/", "/login", "/signup"];
  const publicApiRoutes = ["/api/auth", "/api/health"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicApi = publicApiRoutes.some((r) => pathname.startsWith(r));

  if (!isLoggedIn && !isPublicRoute && !isPublicApi) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", req.headers.get("x-request-id") || generateRequestId());
  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
