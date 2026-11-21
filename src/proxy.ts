import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homeFor, verifySession, type Role } from "@/server/auth/session";

/** Грубая проверка роли по префиксу пути. Точная проверка прав — в каждом сервисе. */
const AREAS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/teacher", roles: ["TEACHER", "ADMIN"] },
  { prefix: "/student", roles: ["STUDENT"] },
  { prefix: "/parent", roles: ["PARENT"] },
  { prefix: "/account", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (!area) return NextResponse.next();

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!area.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*", "/account/:path*", "/login"],
};
