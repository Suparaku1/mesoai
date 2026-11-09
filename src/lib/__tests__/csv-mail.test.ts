import { describe, it, expect } from "vitest";
import { toCSV } from "../csv";
import { escapeHtml } from "../gmail.server";
import { buildEventContent } from "../notify.server";

describe("csv", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(toCSV([])).toBe("");
    expect(toCSV([{ a: 'x,"y"', b: null }])).toBe('a,b\n"x,""y""",');
  });
});

describe("email content", () => {
  it("escapes html", () => {
    expect(escapeHtml("<b>&\"")).not.toContain("<b>");
  });
  it("blocks exam message at grade 4", () => {
    const c = buildEventContent("homework_overall_graded", {
      courseTitle: "TIK", studentName: "<script>", teacherName: "M", grade: 4,
    });
    expect(c.note).toContain("ngelur");
    expect(c.body).not.toContain("<script>");
  });
  it("builds every event", () => {
    for (const e of ["enrollment_requested", "exam_reviewed", "certificate_issued"] as const) {
      expect(buildEventContent(e, { courseTitle: "K", studentName: "S", teacherName: "T" }).subject).toBeTruthy();
    }
  });
});
