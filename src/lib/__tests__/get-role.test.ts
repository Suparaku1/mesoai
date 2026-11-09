import { beforeEach, describe, expect, it, vi } from "vitest";

const { eq } = vi.hoisted(() => ({ eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq }) }) },
}));
import { getAllRoles, getPrimaryRole } from "../get-role";

describe("account role lookup", () => {
  beforeEach(() => eq.mockReset());
  it("keeps the teacher dashboard for the teacher/admin account", async () => {
    eq.mockResolvedValue({ data: [{ role: "admin" }, { role: "teacher" }], error: null });
    expect(await getPrimaryRole("teacher-id")).toBe("teacher");
  });
  it("retains the parent's role", async () => {
    eq.mockResolvedValue({ data: [{ role: "parent" }], error: null });
    expect(await getAllRoles("parent-id")).toEqual(["parent"]);
  });
  it("does not silently treat a database failure as missing permissions", async () => {
    eq.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(getPrimaryRole("user-id")).rejects.toThrow("permission denied");
    await expect(getAllRoles("user-id")).rejects.toThrow("permission denied");
  });
});