import { describe, expect, it } from "vitest";
import { canViewChild, matchesStudentName } from "../parent-policy";

describe("parent relationships", () => {
  it("matches the student's complete name, never a partial name", () => {
    expect(matchesStudentName("Envi Harizi", "Envi", "Harizi")).toBe(true);
    expect(matchesStudentName("Envi", "Envi", "Harizi")).toBe(false);
    expect(matchesStudentName("Envi Hariza", "Envi", "Harizi")).toBe(false);
  });
  it("grants no academic access before approval creates a link", () => {
    expect(canViewChild("parent", "child", [])).toBe(false);
    expect(canViewChild("parent", "child", [{ parent_id: "parent", student_id: "child" }])).toBe(
      true,
    );
  });
  it("does not grant access to another parent's or another student's records", () => {
    const links = [{ parent_id: "parent", student_id: "child" }];
    expect(canViewChild("other-parent", "child", links)).toBe(false);
    expect(canViewChild("parent", "other-child", links)).toBe(false);
  });
});
