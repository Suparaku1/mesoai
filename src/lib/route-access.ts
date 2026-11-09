// Cilat faqe të zonës së hyrë mund të hapë secili rol (edhe me URL direkte).
export type AccessRole = "staff" | "student" | "parent";

export function accessRoleFor(role?: string | null): AccessRole {
  return role === "teacher" || role === "admin" ? "staff" : role === "parent" ? "parent" : "student";
}

const COMMON = ["/dashboard", "/messages", "/announcements", "/settings"];

const STUDENT = [
  ...COMMON,
  "/browse",
  "/tutor",
  "/calendar",
  "/schedule",
  "/exams",
  "/library",
  "/courses/",
  "/topics/",
];

const PARENT = [...COMMON, "/parent"];

function matches(path: string, prefix: string) {
  if (prefix.endsWith("/")) return path.startsWith(prefix);
  return path === prefix || path.startsWith(prefix + "/");
}

export function canAccessPath(role: string | null | undefined, rawPath: string): boolean {
  const path = rawPath.replace(/\/+$/, "") || "/";
  const r = accessRoleFor(role);
  if (r === "staff") return true;
  if (r === "student") {
    // Krijimi i kurseve dhe redaktimi i temave janë vetëm për stafin.
    if (path === "/courses/new" || /^\/topics\/[^/]+\/edit$/.test(path)) return false;
    return STUDENT.some((p) => matches(path, p));
  }
  return PARENT.some((p) => matches(path, p));
}
