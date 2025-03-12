import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./lib/auth/config";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoutes = ["/dashboard", "/projects", "/settings"];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route) || pathname === route,
  );

  if (isProtectedRoute) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("callbackUrl", request.url.toString());
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (pathname === "/login") {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session?.user) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const redirectUrl = new URL(callbackUrl || "/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/settings/:path*",
    "/login",
  ],
};
