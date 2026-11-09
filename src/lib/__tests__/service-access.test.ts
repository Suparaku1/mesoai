import { describe, expect, it } from "vitest";
import { canRetryDelivery, assertStaff } from "../staff-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { toCSV } from "../csv";

describe("service safeguards", () => {
  it("denies shared connector access to students and parents", async () => {
    for (const role of ["student", "parent"]) {
      const client = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) }) } as unknown as SupabaseClient<Database>;
      await expect(assertStaff(client, "user")).rejects.toThrow("Vetëm mësuesit");
    }
  });
  it("never retries an uncertain send or a calendar row as email", () => {
    expect(canRetryDelivery({ channel: "email", status: "unknown" })).toBe(false);
    expect(canRetryDelivery({ channel: "calendar", status: "failed" })).toBe(false);
    expect(canRetryDelivery({ channel: "email", status: "failed" })).toBe(true);
  });
  it("neutralizes spreadsheet formulas without changing numeric amounts", () => {
    expect(toCSV([{ value: "=1+1", amount: -4 }])).toBe("value,amount\n'=1+1,-4");
    expect(toCSV([{ value: "\t@SUM(1)" }])).toBe("value\n'\t@SUM(1)");
  });
});