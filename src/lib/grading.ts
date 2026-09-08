/**
 * Shtresa e vetme e logjikës së notimit (client + server e përdorin këtë).
 * Notat shqiptare: 4 = ngelur, 10 = shkëlqyeshëm.
 */
import { PASS_GRADE, CERTIFICATE_MIN_AVG } from "./constants";

export const GRADE_MIN = 4;
export const GRADE_MAX = 10;

export { PASS_GRADE, CERTIFICATE_MIN_AVG };

/** A është nota një notë e vlefshme 4–10? */
export function isValidGrade(grade: unknown): grade is number {
  return Number.isInteger(grade) && (grade as number) >= GRADE_MIN && (grade as number) <= GRADE_MAX;
}

/** Kufizon çdo numër brenda 4–10. */
export function clampGrade(value: number): number {
  return Math.max(GRADE_MIN, Math.min(GRADE_MAX, Math.round(value)));
}

/** Kaluese = 5 e lart. */
export function isPassing(grade: number | null | undefined): boolean {
  return (grade ?? 0) >= PASS_GRADE;
}

/** Nxënësi lejohet në testimin e semestrit vetëm me notë detyrash 5+. */
export function canTakeExam(homeworkGrade: number | null | undefined): boolean {
  return isPassing(homeworkGrade);
}

/** Rezultati i kuizit (0–1) → notë 4–10. */
export function scoreToGrade(score: number): number {
  const ratio = score > 1 ? score / 100 : score;
  return clampGrade(GRADE_MIN + ratio * (GRADE_MAX - GRADE_MIN));
}

/** Mesatarja e një liste notash (null nëse s'ka nota). */
export function averageGrade(grades: Array<number | null | undefined>): number | null {
  const valid = grades.filter((g): g is number => typeof g === "number");
  if (!valid.length) return null;
  return valid.reduce((s, g) => s + g, 0) / valid.length;
}

/** Certifikata jepet vetëm me mesatare 7+ dhe pa testime në pritje. */
export function isCertificateEligible(average: number | null, pendingReview = false): boolean {
  return !pendingReview && average !== null && average >= CERTIFICATE_MIN_AVG;
}

/** Etiketë njerëzore për notën. */
export function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "Pa notë";
  if (grade === 4) return "Ngelur";
  if (grade === 5) return "Mjaftueshëm";
  if (grade <= 7) return "Mirë";
  if (grade <= 9) return "Shumë mirë";
  return "Shkëlqyeshëm";
}

/** Mesazh gabimi standard për input të pavlefshëm. */
export const GRADE_RANGE_ERROR = `Nota duhet ${GRADE_MIN}–${GRADE_MAX}`;
