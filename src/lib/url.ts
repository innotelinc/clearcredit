import { NextRequest } from "next/server";

function sanitizeOrigin(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getPublicOrigin(request?: NextRequest): string {
  const configuredOrigin =
    sanitizeOrigin(process.env.PUBLIC_APP_URL) ||
    sanitizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    sanitizeOrigin(process.env.APP_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host");

    if (forwardedProto && forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    const host = request.headers.get("host");
    if (host) {
      const proto = request.nextUrl.protocol?.replace(":", "") || "https";
      return `${proto}://${host}`;
    }

    return request.nextUrl.origin;
  }

  return sanitizeOrigin(process.env.NEXTAUTH_URL) || "http://localhost:3000";
}

export function buildPublicUrl(path: string, request?: NextRequest): string {
  return new URL(path, getPublicOrigin(request)).toString();
}
