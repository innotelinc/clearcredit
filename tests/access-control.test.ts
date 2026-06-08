import { describe, expect, it } from "vitest";
import {
  canAccessClient,
  canAccessDispute,
  canCreateClientProfile,
  sanitizeSignupRole,
  type AccessUser,
} from "../src/lib/access-control";

const admin: AccessUser = {
  id: "admin-1",
  email: "admin@example.com",
  role: "ADMIN",
  clientIds: [],
};

const clientUser: AccessUser = {
  id: "user-1",
  email: "client@example.com",
  role: "CLIENT",
  clientIds: ["client-1"],
};

describe("sanitizeSignupRole", () => {
  it("always forces public signup to CLIENT even if ADMIN is requested", () => {
    expect(sanitizeSignupRole(undefined)).toBe("CLIENT");
    expect(sanitizeSignupRole("CLIENT")).toBe("CLIENT");
    expect(sanitizeSignupRole("ADMIN")).toBe("CLIENT");
  });
});

describe("canCreateClientProfile", () => {
  it("allows admins to create any client profile", () => {
    expect(canCreateClientProfile(admin, undefined)).toBe(true);
    expect(canCreateClientProfile(admin, "client-99")).toBe(true);
  });

  it("only allows clients to create their own client profile", () => {
    expect(canCreateClientProfile(clientUser, "user-1")).toBe(true);
    expect(canCreateClientProfile(clientUser, "user-2")).toBe(false);
    expect(canCreateClientProfile(clientUser, undefined)).toBe(false);
  });
});

describe("canAccessClient", () => {
  it("allows admins to access any client", () => {
    expect(canAccessClient(admin, "client-1")).toBe(true);
    expect(canAccessClient(admin, "client-2")).toBe(true);
  });

  it("restricts clients to their own client records", () => {
    expect(canAccessClient(clientUser, "client-1")).toBe(true);
    expect(canAccessClient(clientUser, "client-2")).toBe(false);
  });
});

describe("canAccessDispute", () => {
  it("allows admins to access any dispute owner", () => {
    expect(canAccessDispute(admin, "client-1")).toBe(true);
  });

  it("restricts clients to disputes owned by their client profile", () => {
    expect(canAccessDispute(clientUser, "client-1")).toBe(true);
    expect(canAccessDispute(clientUser, "client-3")).toBe(false);
  });
});
