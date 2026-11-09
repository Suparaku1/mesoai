import { describe, expect, it } from "vitest";
import { canAccessPath } from "../route-access";

describe("route access by role", () => {
  it("student cannot open staff pages", () => {
    for (const p of ["/crm", "/finance", "/analytics", "/admin/users", "/attendance", "/courses/new", "/topics/x/edit", "/parent", "/quizzes/x"])
      expect(canAccessPath("student", p)).toBe(false);
  });
  it("student can open own pages", () => {
    for (const p of ["/dashboard", "/browse", "/courses/abc", "/topics/abc", "/tutor/t1", "/exams"])
      expect(canAccessPath("student", p)).toBe(true);
  });
  it("parent only sees parent pages", () => {
    expect(canAccessPath("parent", "/parent")).toBe(true);
    expect(canAccessPath("parent", "/messages")).toBe(true);
    for (const p of ["/browse", "/courses/abc", "/tutor", "/crm/contacts", "/admin/audit"])
      expect(canAccessPath("parent", p)).toBe(false);
  });
  it("teacher and admin open everything", () => {
    expect(canAccessPath("teacher", "/crm")).toBe(true);
    expect(canAccessPath("admin", "/admin/audit")).toBe(true);
  });
});
