import { describe, it, expect } from "vitest";
import {
  mergeWeekly,
  type BrokerSeries,
  type MergedRow,
} from "../MultiBrokerWeeklySparkline";

// ─── Naïve reference (kept in lock-step with production behavior) ───────────
// Reused as a correctness oracle: any divergence from this on extreme-gap
// inputs would visibly change the chart (different null pattern → different
// connectNulls bridges, different x-axis tick set, different tooltip rows).
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

// Helpers
const baseDate = new Date("2025-01-06T00:00:00Z").getTime(); // Monday
function week(i: number) {
  const d = new Date(baseDate + i * 7 * 24 * 60 * 60 * 1000);
  return {
    weekStart: d.toISOString().slice(0, 10),
    label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}

function fullSeries(name: string, weeks: number, seed: number): BrokerSeries {
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const { weekStart, label } = week(i);
    return {
      weekStart,
      label,
      meetings: 1 + ((i + seed) % 9),
      avgScore: 50 + ((i * 7 + seed * 3) % 50),
    };
  });
  return { name, weekly };
}

function meetingsCol(rows: MergedRow[], idx: number): Array<number | null> {
  return rows.map((r) => {
    const v = r[`meetings_${idx}`];
    return v === null ? null : (v as number);
  });
}
function scoreCol(rows: MergedRow[], idx: number): Array<number | null> {
  return rows.map((r) => {
    const v = r[`avgScore_${idx}`];
    return v === null ? null : (v as number);
  });
}

describe("mergeWeekly — extreme gap scenarios", () => {
  it("broker with EVERY week missing (empty array) keeps full union and emits all-null columns", () => {
    const a = fullSeries("Amanda", 12, 1);
    const series: BrokerSeries[] = [a, { name: "Ghost", weekly: [] }];
    const rows = mergeWeekly(series);

    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(12); // union driven by Amanda
    // Ghost column is fully null — connectNulls has nothing to bridge → no line drawn.
    expect(meetingsCol(rows, 1)).toEqual(Array(12).fill(null));
    expect(scoreCol(rows, 1)).toEqual(Array(12).fill(null));
    // Amanda's data is untouched.
    expect(meetingsCol(rows, 0).every((v) => typeof v === "number")).toBe(true);
  });

  it("broker with weekly === undefined behaves identically to empty array", () => {
    const a = fullSeries("Amanda", 8, 2);
    const withEmpty = mergeWeekly([a, { name: "Ghost", weekly: [] }]);
    const withUndef = mergeWeekly([a, { name: "Ghost", weekly: undefined }]);
    expect(withUndef).toEqual(withEmpty);
    expect(withUndef).toEqual(mergeWeeklyNaive([a, { name: "Ghost", weekly: undefined }]));
  });

  it("ALL brokers empty/undefined → produces an empty merged array", () => {
    const series: BrokerSeries[] = [
      { name: "A", weekly: [] },
      { name: "B", weekly: undefined },
      { name: "C", weekly: [] },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(0);
  });

  it("broker with EVERY week meeting=0 keeps literal 0 for meetings and null for avgScore", () => {
    // Important for chart: meetings stays 0 (volume area shows the floor),
    // avgScore is null so the score line doesn't dive to zero.
    const weekly = Array.from({ length: 6 }, (_, i) => {
      const { weekStart, label } = week(i);
      // avgScore intentionally non-zero in source — production logic must
      // still null it out because meetings === 0 (no meaningful score).
      return { weekStart, label, meetings: 0, avgScore: 80 };
    });
    const series: BrokerSeries[] = [
      fullSeries("Amanda", 6, 3),
      { name: "Idle", weekly },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(meetingsCol(rows, 1)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(scoreCol(rows, 1)).toEqual([null, null, null, null, null, null]);
  });

  it("single isolated week surrounded by gaps on both sides → standalone null-isolated point", () => {
    // Recharts with connectNulls=true will still draw a dot for isolated points.
    // We just need to guarantee the data shape preserves the isolation.
    const a = fullSeries("Amanda", 10, 4);
    const isolated = week(5); // single point in the middle
    const series: BrokerSeries[] = [
      a,
      {
        name: "Sparse",
        weekly: [{ ...isolated, meetings: 7, avgScore: 88 }],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));

    // Sparse column: nulls everywhere except index 5.
    const sparseMeetings = meetingsCol(rows, 1);
    const sparseScore = scoreCol(rows, 1);
    expect(sparseMeetings.filter((v) => v !== null)).toEqual([7]);
    expect(sparseScore.filter((v) => v !== null)).toEqual([88]);
    expect(sparseMeetings[5]).toBe(7);
    expect(sparseScore[5]).toBe(88);
  });

  it("alternating weeks (every other week missing) → strict null-on-gap pattern", () => {
    const a = fullSeries("Amanda", 12, 5);
    const weekly = [];
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) continue; // odd weeks only
      const { weekStart, label } = week(i);
      weekly.push({ weekStart, label, meetings: 2 + i, avgScore: 60 + i });
    }
    const series: BrokerSeries[] = [a, { name: "Alt", weekly }];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));

    const altMeetings = meetingsCol(rows, 1);
    expect(altMeetings).toHaveLength(12);
    // Even indices null, odd indices numeric.
    altMeetings.forEach((v, i) => {
      if (i % 2 === 0) expect(v).toBeNull();
      else expect(typeof v).toBe("number");
    });
  });

  it("broker contributes a week NO other broker has → row appears with that broker only populated", () => {
    const a = fullSeries("Amanda", 4, 6);
    const lone = week(99); // far-future week, definitely not in Amanda's range
    const series: BrokerSeries[] = [
      a,
      {
        name: "Outlier",
        weekly: [{ ...lone, meetings: 5, avgScore: 77 }],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(5); // 4 Amanda + 1 outlier
    // Outlier row is the last (sorted by weekStart) and has Amanda nulled.
    const last = rows[rows.length - 1];
    expect(last.weekStart).toBe(lone.weekStart);
    expect(last.meetings_0).toBeNull();
    expect(last.avgScore_0).toBeNull();
    expect(last.meetings_1).toBe(5);
    expect(last.avgScore_1).toBe(77);
  });

  it("3 brokers, only the middle one has data → flanking brokers fully null", () => {
    const middle = fullSeries("Middle", 6, 7);
    const series: BrokerSeries[] = [
      { name: "Left", weekly: [] },
      middle,
      { name: "Right", weekly: undefined },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(6);
    expect(meetingsCol(rows, 0)).toEqual(Array(6).fill(null));
    expect(scoreCol(rows, 0)).toEqual(Array(6).fill(null));
    expect(meetingsCol(rows, 2)).toEqual(Array(6).fill(null));
    expect(scoreCol(rows, 2)).toEqual(Array(6).fill(null));
    // Middle column populated.
    expect(meetingsCol(rows, 1).every((v) => typeof v === "number")).toBe(true);
  });

  it("very long sparse series (300 weeks, only 3 datapoints) stays correctly aligned", () => {
    // Stress alignment + sort stability when one broker dominates the union
    // and the other contributes a handful of distant points.
    const dense = fullSeries("Dense", 300, 8);
    const picks = [10, 150, 290].map((i) => {
      const { weekStart, label } = week(i);
      return { weekStart, label, meetings: 4, avgScore: 72 };
    });
    const series: BrokerSeries[] = [dense, { name: "Sparse", weekly: picks }];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(rows).toHaveLength(300);

    // Sparse must be non-null at exactly the 3 chosen indices.
    const sparseMeetings = meetingsCol(rows, 1);
    const nonNullIdx = sparseMeetings
      .map((v, i) => (v === null ? -1 : i))
      .filter((i) => i >= 0);
    expect(nonNullIdx).toEqual([10, 150, 290]);
  });

  it("zero-meeting week embedded in otherwise dense series nulls only avgScore at that index", () => {
    const weekly = Array.from({ length: 5 }, (_, i) => {
      const { weekStart, label } = week(i);
      const meetings = i === 2 ? 0 : 3 + i;
      return { weekStart, label, meetings, avgScore: meetings === 0 ? 0 : 60 + i };
    });
    const series: BrokerSeries[] = [{ name: "Solo", weekly }];
    const rows = mergeWeekly(series);
    expect(rows).toEqual(mergeWeeklyNaive(series));
    expect(meetingsCol(rows, 0)).toEqual([3, 4, 0, 6, 7]);
    expect(scoreCol(rows, 0)).toEqual([60, 61, null, 63, 64]);
  });
});
