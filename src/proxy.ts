import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const country = request.headers.get("x-vercel-ip-country") || "";
  const city = request.headers.get("x-vercel-ip-city") || "";

  if (country) {
    response.cookies.set("geo-country", country, { path: "/", maxAge: 86400 });
  }
  if (city) {
    response.cookies.set("geo-city", decodeURIComponent(city), {
      path: "/",
      maxAge: 86400,
    });
  }

  return response;
}

export const config = {
  matcher: ["/"],
};
