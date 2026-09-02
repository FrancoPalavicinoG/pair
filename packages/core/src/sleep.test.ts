import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSleepStages } from "./sleep";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("../test/fixtures/sleep-daily.anon.json", import.meta.url)), "utf-8"),
);

describe("parseSleepStages", () => {
  it("mapea activityLevel a fase y devuelve los segmentos en orden cronológico", () => {
    const segments = parseSleepStages(fixture);

    expect(segments).not.toBeNull();
    expect(segments!.length).toBe(14);
    expect(segments![0]?.stage).toBe("light");
    expect(segments![1]?.stage).toBe("deep");
    expect(segments![3]?.stage).toBe("rem");
    expect(segments![6]?.stage).toBe("awake");

    for (let i = 1; i < segments!.length; i++) {
      expect(new Date(segments![i]!.startLocal).getTime()).toBeGreaterThanOrEqual(
        new Date(segments![i - 1]!.endLocal).getTime(),
      );
    }
  });

  it("corrige el offset GMT->local usando sleepStartTimestampGMT/Local del mismo día", () => {
    const segments = parseSleepStages(fixture)!;

    // sleepStartTimestampGMT 03:39:50 - sleepStartTimestampLocal 23:39:50 (día anterior) = 4h de offset.
    expect(segments[0]?.startLocal).toBe("2026-08-26T23:39:50.000Z");
    expect(segments[segments.length - 1]?.endLocal).toBe("2026-08-27T07:22:50.000Z");
  });

  it("devuelve null si no hay sleepLevels", () => {
    const withoutLevels = Object.fromEntries(
      Object.entries(fixture as Record<string, unknown>).filter(([key]) => key !== "sleepLevels"),
    );
    expect(parseSleepStages(withoutLevels)).toBeNull();
  });
});
