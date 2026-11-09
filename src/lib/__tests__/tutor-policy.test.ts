import { describe, it, expect } from "vitest";
import { TutorQuestion, TUTOR_DAILY_LIMIT, tutorUsageDay } from "../tutor-policy";
describe("Tutor usage rules", () => {
  it("allows 50 questions per day", () => expect(TUTOR_DAILY_LIMIT).toBe(50));
  it("accepts 4000 characters and rejects 4001", () => {
    expect(TutorQuestion.safeParse("a".repeat(4000)).success).toBe(true);
    expect(TutorQuestion.safeParse("a".repeat(4001)).success).toBe(false);
  });
  it("rejects empty questions", () => expect(TutorQuestion.safeParse("  ").success).toBe(false));
  it("resets at midnight in Tirana rather than UTC", () => {
    expect(tutorUsageDay(new Date("2026-10-18T21:59:00Z"))).toBe("2026-10-18");
    expect(tutorUsageDay(new Date("2026-10-18T22:00:00Z"))).toBe("2026-10-19");
  });
});
