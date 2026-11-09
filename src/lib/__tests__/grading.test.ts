import { describe, it, expect } from "vitest";
import {
  isValidGrade, clampGrade, isPassing, canTakeExam, scoreToGrade,
  averageGrade, isCertificateEligible, gradeLabel,
} from "../grading";

describe("grading", () => {
  it("validates 4–10 integers", () => {
    expect(isValidGrade(4)).toBe(true);
    expect(isValidGrade(10)).toBe(true);
    expect(isValidGrade(3)).toBe(false);
    expect(isValidGrade(7.5)).toBe(false);
    expect(isValidGrade("8")).toBe(false);
  });
  it("clamps", () => {
    expect(clampGrade(2)).toBe(4);
    expect(clampGrade(12)).toBe(10);
    expect(clampGrade(6.6)).toBe(7);
  });
  it("4 fails, 5 passes; exam blocked with 4", () => {
    expect(isPassing(4)).toBe(false);
    expect(isPassing(5)).toBe(true);
    expect(isPassing(null)).toBe(false);
    expect(canTakeExam(4)).toBe(false);
    expect(canTakeExam(5)).toBe(true);
  });
  it("maps score to grade", () => {
    expect(scoreToGrade(0)).toBe(4);
    expect(scoreToGrade(1)).toBe(10);
    expect(scoreToGrade(50)).toBe(7);
  });
  it("averages and certificate needs 7+ without pending review", () => {
    expect(averageGrade([])).toBeNull();
    expect(averageGrade([6, 8, null])).toBe(7);
    expect(isCertificateEligible(7)).toBe(true);
    expect(isCertificateEligible(6.9)).toBe(false);
    expect(isCertificateEligible(9, true)).toBe(false);
    expect(isCertificateEligible(null)).toBe(false);
  });
  it("labels", () => {
    expect(gradeLabel(4)).toBe("Ngelur");
    expect(gradeLabel(10)).toBe("Shkëlqyeshëm");
    expect(gradeLabel(null)).toBe("Pa notë");
  });
});
