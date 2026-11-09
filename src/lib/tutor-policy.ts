import { z } from "zod";
export const TUTOR_DAILY_LIMIT = 50;
export const TUTOR_MESSAGE_LIMIT = 4000;
export const TutorQuestion = z.string().trim().min(1).max(TUTOR_MESSAGE_LIMIT);
export function tutorUsageDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
