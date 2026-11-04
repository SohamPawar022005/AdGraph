import { describe, it, expect, beforeEach } from "vitest";
import { getRoleDashboardRoute } from "../lib/types";
import { setSession, clearSession, getToken, getRole, getEmail } from "../lib/api";

describe("Role Dashboard Route Mapping", () => {
  it("maps ADMIN to /audit (Admin Governance Dashboard)", () => {
    expect(getRoleDashboardRoute("ADMIN")).toBe("/audit");
    expect(getRoleDashboardRoute("admin")).toBe("/audit");
  });

  it("maps REGULATORY_REVIEWER to /review (Review Queue Dashboard)", () => {
    expect(getRoleDashboardRoute("REGULATORY_REVIEWER")).toBe("/review");
    expect(getRoleDashboardRoute("REVIEWER")).toBe("/review");
  });

  it("maps OFFICER to /alerts (Compliance Alerts & Analytics Dashboard)", () => {
    expect(getRoleDashboardRoute("OFFICER")).toBe("/alerts");
    expect(getRoleDashboardRoute("COMPLIANCE_OFFICER")).toBe("/alerts");
  });

  it("maps BUSINESS_USER and APPLICANT to /applications (Application Tracker)", () => {
    expect(getRoleDashboardRoute("BUSINESS_USER")).toBe("/applications");
    expect(getRoleDashboardRoute("APPLICANT")).toBe("/applications");
  });

  it("falls back to / for unknown or empty roles", () => {
    expect(getRoleDashboardRoute("UNKNOWN_ROLE")).toBe("/");
    expect(getRoleDashboardRoute(null)).toBe("/");
    expect(getRoleDashboardRoute(undefined)).toBe("/");
  });
});

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  };
}

describe("Auth Session Storage", () => {
  beforeEach(() => {
    const mockLocal = createMockStorage();
    const mockSession = createMockStorage();
    // @ts-expect-error mock window for testing
    globalThis.window = {
      localStorage: mockLocal,
      sessionStorage: mockSession,
    };
    clearSession();
  });

  it("stores and retrieves session in localStorage when remember=true", () => {
    setSession("fake-token-123", "ADMIN", "admin@permitgraph.dev", true);
    expect(getToken()).toBe("fake-token-123");
    expect(getRole()).toBe("ADMIN");
    expect(getEmail()).toBe("admin@permitgraph.dev");
  });

  it("clears session correctly", () => {
    setSession("fake-token-456", "OFFICER", "officer@permitgraph.dev", false);
    expect(getToken()).toBe("fake-token-456");
    clearSession();
    expect(getToken()).toBeNull();
    expect(getRole()).toBeNull();
    expect(getEmail()).toBeNull();
  });
});
