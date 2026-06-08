import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type AppRole = "ADMIN" | "CLIENT";

export interface AccessUser {
  id: string;
  email: string;
  role: AppRole;
  clientIds: string[];
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function sanitizeSignupRole(requestedRole?: string | null): AppRole {
  void requestedRole;
  return "CLIENT";
}

export function isAdmin(user: Pick<AccessUser, "role">): boolean {
  return user.role === "ADMIN";
}

export function canCreateClientProfile(user: AccessUser, targetUserId?: string | null): boolean {
  if (isAdmin(user)) return true;
  return Boolean(targetUserId) && user.id === targetUserId;
}

export function canAccessClient(user: AccessUser, clientId: string): boolean {
  return isAdmin(user) || user.clientIds.includes(clientId);
}

export function canAccessDispute(user: AccessUser, clientId: string): boolean {
  return canAccessClient(user, clientId);
}

export async function getRequestUser(request: NextRequest): Promise<AccessUser | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: token.email },
    include: { clients: { select: { id: true } } },
  });

  if (!user || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
    clientIds: user.clients.map((client) => client.id),
  };
}

export async function requireRequestUser(request: NextRequest): Promise<AccessUser> {
  const user = await getRequestUser(request);
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  return user;
}

export async function requireAdminUser(request: NextRequest): Promise<AccessUser> {
  const user = await requireRequestUser(request);
  if (!isAdmin(user)) {
    throw new HttpError(403, "Admin access required");
  }
  return user;
}

export function assertCanAccessClient(user: AccessUser, clientId: string): void {
  if (!canAccessClient(user, clientId)) {
    throw new HttpError(403, "Forbidden");
  }
}

export function assertCanAccessDispute(user: AccessUser, clientId: string): void {
  if (!canAccessDispute(user, clientId)) {
    throw new HttpError(403, "Forbidden");
  }
}
