import { NextRequest, NextResponse } from "next/server";

// Password-protects the dashboard (the Telegram webhook is excluded; it has its own secret)
export function middleware(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Basic ")) {
    const pass = atob(h.slice(6)).split(":").slice(1).join(":");
    if (pass && pass === process.env.DASHBOARD_PASSWORD) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401, headers: { "WWW-Authenticate": 'Basic realm="Records"' },
  });
}
export const config = { matcher: ["/((?!api/telegram|_next).*)"] };
