import { describe, it, expect } from "vitest";
import {
  mergeWeekly,
  type BrokerSeries,
  type MergedRow,
} from "../MultiBrokerWeeklySparkline";

// Naïve reference kept in lock-step with the production behavior pre-optimization.
// This is the same shape Recharts consumes — any divergence here would change
// the rendered chart, including null gaps and connectNulls segments.
function mergeWeeklyNaive(series: BrokerSeries[]): MergedRow[] {
  const allKeys = new Set<string>();
  const labelByKey = new Map<string, string>();
  for (const s of series) {
    for (const w of s.weekly ?? []) {
      allKeys.add(w.weekStart);
      labelByKey.set(w.weekStart, w.label);
    }
  }
  const sortedKeys = Array.from(allKeys).sort();
  return sortedKeys.map((weekStart) => {
    const row: MergedRow = { weekStart, label: labelByKey.get(weekStart) ?? weekStart };
    series.forEach((s, idx) => {
      const point = s.weekly?.find((w) => w.weekStart === weekStart);
      if (!point || point.meetings === 0) {
        row[`meetings_${idx}`] = point ? point.meetings : null;
        row[`avgScore_${idx}`] = null;
      } else {
        row[`meetings_${idx}`] = point.meetings;
        row[`avgScore_${idx}`] = point.avgScore;
      }
    });
    return row;
  });
}

// Helper: extract just the score series for a broker as Recharts would see it.
// `connectNulls` only matters when the value is exactly `null` (not undefined,
// not 0). This helper makes regressions in null-vs-zero handling obvious.
function scoreSeries(rows: MergedRow[], brokerIdx: number): Array<number | null> {
  return rows.map((r) => {
    const v = r[`avgScore_${brokerIdx}`];
    return v === null ? null : (v as number);
  });
}

describe("mergeWeekly — chart-rendering equivalence", () => {
  it("scenario A: brokers share all weeks (no gaps)", () => {
    const series: BrokerSeries[] = [
      {
        name: "Amanda",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 4, avgScore: 70 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 6, avgScore: 75 },
          { weekStart: "2025-01-20", label: "20/01", meetings: 5, avgScore: 80 },
        ],
      },
      {
        name: "Rodrigo",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 3, avgScore: 60 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 7, avgScore: 65 },
          { weekStart: "2025-01-20", label: "20/01", meetings: 8, avgScore: 70 },
        ],
      },
    ];
    expect(mergeWeekly(series)).toEqual(mergeWeeklyNaive(series));
    // No nulls anywhere — line is fully connected naturally.
    expect(scoreSeries(mergeWeekly(series), 0)).toEqual([70, 75, 80]);
    expect(scoreSeries(mergeWeekly(series), 1)).toEqual([60, 65, 70]);
  });

  it("scenario B: broker B is missing two middle weeks → connectNulls bridges them", () => {
    const series: BrokerSeries[] = [
      {
        name: "Amanda",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 4, avgScore: 70 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 6, avgScore: 75 },
          { weekStart: "2025-01-20", label: "20/01", meetings: 5, avgScore: 80 },
          { weekStart: "2025-01-27", label: "27/01", meetings: 3, avgScore: 65 },
        ],
      },
      {
        name: "Rodrigo",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 3, avgScore: 60 },
          // 13/01 and 20/01 missing
          { weekStart: "2025-01-27", label: "27/01", meetings: 8, avgScore: 70 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    // Broker B must have explicit nulls in the gap weeks so connectNulls
    // draws a bridge instead of a gap.
    expect(scoreSeries(rows, 1)).toEqual([60, null, null, 70]);
    expect(rows[1].meetings_1).toBeNull();
    expect(rows[2].meetings_1).toBeNull();
  });

  it("scenario C: meetings === 0 yields meetings=0 but avgScore=null (avoid score line dropping to 0)", () => {
    const series: BrokerSeries[] = [
      {
        name: "Amanda",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 4, avgScore: 70 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 0, avgScore: 0 },
          { weekStart: "2025-01-20", label: "20/01", meetings: 5, avgScore: 80 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    // Meetings keep the literal 0 (volume area shows the dip).
    expect(rows.map((r) => r.meetings_0)).toEqual([4, 0, 5]);
    // Score is nulled so connectNulls bridges 70 → 80 over the 0-meeting week.
    expect(scoreSeries(rows, 0)).toEqual([70, null, 80]);
  });

  it("scenario D: brokers with disjoint week sets → union of weeks, each broker null where absent", () => {
    const series: BrokerSeries[] = [
      {
        name: "A",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 2, avgScore: 50 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 3, avgScore: 55 },
        ],
      },
      {
        name: "B",
        weekly: [
          { weekStart: "2025-01-20", label: "20/01", meetings: 4, avgScore: 60 },
          { weekStart: "2025-01-27", label: "27/01", meetings: 5, avgScore: 65 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows.map((r) => r.weekStart)).toEqual([
      "2025-01-06",
      "2025-01-13",
      "2025-01-20",
      "2025-01-27",
    ]);
    expect(scoreSeries(rows, 0)).toEqual([50, 55, null, null]);
    expect(scoreSeries(rows, 1)).toEqual([null, null, 60, 65]);
  });

  it("scenario E: input weeks given out-of-order are still emitted sorted by weekStart", () => {
    const series: BrokerSeries[] = [
      {
        name: "A",
        weekly: [
          { weekStart: "2025-01-20", label: "20/01", meetings: 5, avgScore: 80 },
          { weekStart: "2025-01-06", label: "06/01", meetings: 4, avgScore: 70 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 6, avgScore: 75 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows.map((r) => r.weekStart)).toEqual([
      "2025-01-06",
      "2025-01-13",
      "2025-01-20",
    ]);
    expect(scoreSeries(rows, 0)).toEqual([70, 75, 80]);
  });

  it("scenario F: empty/undefined weekly arrays produce all-null columns without throwing", () => {
    const series: BrokerSeries[] = [
      { name: "Empty", weekly: [] },
      { name: "Missing", weekly: undefined },
      {
        name: "Real",
        weekly: [
          { weekStart: "2025-02-03", label: "03/02", meetings: 2, avgScore: 55 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      meetings_0: null,
      avgScore_0: null,
      meetings_1: null,
      avgScore_1: null,
      meetings_2: 2,
      avgScore_2: 55,
    });
  });

  it("scenario G: null discrimination — null !== 0 and null !== undefined for every row", () => {
    // Recharts treats `null` as a gap (with connectNulls bridging) but
    // treats `0` as a real value. This test guarantees we never accidentally
    // emit `0` where the naïve impl would emit `null`, which would change
    // the rendered chart visibly.
    const series: BrokerSeries[] = [
      {
        name: "A",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 0, avgScore: 0 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 4, avgScore: 70 },
        ],
      },
      {
        name: "B",
        weekly: [
          { weekStart: "2025-01-13", label: "13/01", meetings: 3, avgScore: 60 },
        ],
      },
    ];
    const rows = mergeWeekly(series);
    const ref = mergeWeeklyNaive(series);

    for (let i = 0; i < rows.length; i++) {
      for (const key of Object.keys(rows[i])) {
        // Strict `===` to catch null-vs-0 and null-vs-undefined drift.
        expect(rows[i][key]).toBe(ref[i][key]);
      }
    }
  });
});
