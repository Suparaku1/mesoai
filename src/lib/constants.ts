export const DREJTIMET = ["Elektroteknike", "TIK"] as const;
export const KLASAT = ["10", "11", "12", "13"] as const;
export const PARALELET = ["A", "B", "C", "D"] as const;

export type Drejtimi = (typeof DREJTIMET)[number];
export type Klasa = (typeof KLASAT)[number];
export type Paralelja = (typeof PARALELET)[number];
export type AppRole = "teacher" | "student";

/** Kalimtare: 4 = ngelur, 5+ lejon hyrjen në provim. */
export const PASS_GRADE = 5;
/** Mesatarja minimale për të përfituar certifikatën. */
export const CERTIFICATE_MIN_AVG = 7;
