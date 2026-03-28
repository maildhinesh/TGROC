import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const role = token.role as string;
    const status = token.status as string;

    // Deactivated or pending users can only access the restricted page
    if (status === "INACTIVE" || status === "PENDING") {
      if (!pathname.startsWith("/auth") && !pathname.startsWith("/restricted")) {
        return NextResponse.redirect(new URL("/restricted", req.url));
      }
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Office bearer routes
    if (pathname.startsWith("/officer") && role !== "OFFICE_BEARER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Membership fees config — accessible to Admin and Office Bearer
    if (pathname.startsWith("/fees") && role !== "ADMIN" && role !== "OFFICE_BEARER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Event management — accessible to Admin and Office Bearer
    if (
      (pathname === "/events/manage" || pathname.startsWith("/events/manage/")) &&
      role !== "ADMIN" &&
      role !== "OFFICE_BEARER"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect to appropriate dashboard based on role
    if (pathname === "/dashboard") {
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (role === "OFFICE_BEARER") {
        return NextResponse.redirect(new URL("/officer", req.url));
      }
      return NextResponse.redirect(new URL("/member", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/officer/:path*",
    "/member/:path*",
    "/fees/:path*",
    "/events/manage",
    "/events/manage/:path*",
    "/restricted",
  ],
};
