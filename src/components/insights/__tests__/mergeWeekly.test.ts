import { describe, it, expect } from "vitest";
import { mergeWeekly, type BrokerSeries, type MergedRow } from "../MultiBrokerWeeklySparkline";
import { adaptiveCompare, fmt } from "@/test/perfTimer";

// ─── Reference: naïve O(W·B·Pmax) implementation kept in lock-step with the
// production one, used as a correctness oracle for the optimized version. ───
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

// Deterministic dataset generator. Each broker covers a different (overlapping)
// slice of weeks so we exercise both the alignment logic and the null-fill path.
function makeSeries(weeks: number, brokers: number): BrokerSeries[] {
  const baseDate = new Date("2025-01-06T00:00:00Z").getTime(); // Monday
  const weekKey = (i: number) => {
    const d = new Date(baseDate + i * 7 * 24 * 60 * 60 * 1000);
    return {
      weekStart: d.toISOString().slice(0, 10),
      label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  };
  return Array.from({ length: brokers }, (_, b) => {
    // Each broker skips ~10% of weeks (different ones per broker via mod) to
    // create realistic gaps that exercise the connectNulls path.
    const weekly = [];
    for (let i = 0; i < weeks; i++) {
      if ((i + b) % 10 === 0) continue; // gap
      const { weekStart, label } = weekKey(i);
      // Some weeks intentionally have 0 meetings to verify the score=null guard.
      const meetings = (i + b) % 7 === 0 ? 0 : 1 + ((i * (b + 1)) % 9);
      const avgScore = meetings === 0 ? 0 : 40 + ((i * 13 + b * 7) % 60);
      weekly.push({ weekStart, label, meetings, avgScore });
    }
    return { name: `Broker ${b + 1}`, weekly };
  });
}

describe("mergeWeekly", () => {
  it("matches the naïve implementation exactly on a small dataset", () => {
    const series = makeSeries(12, 2);
    expect(mergeWeekly(series)).toEqual(mergeWeeklyNaive(series));
  });

  it("matches the naïve implementation on a large, gap-heavy dataset", () => {
    const series = makeSeries(200, 6);
    expect(mergeWeekly(series)).toEqual(mergeWeeklyNaive(series));
  });

  it("nulls out avgScore (but keeps meetings) when meetings === 0", () => {
    const series: BrokerSeries[] = [
      {
        name: "A",
        weekly: [
          { weekStart: "2025-01-06", label: "06/01", meetings: 0, avgScore: 88 },
          { weekStart: "2025-01-13", label: "13/01", meetings: 3, avgScore: 70 },
        ],
      },
    ];
    const [w0, w1] = mergeWeekly(series);
    expect(w0.meetings_0).toBe(0);
    expect(w0.avgScore_0).toBeNull();
    expect(w1.meetings_0).toBe(3);
    expect(w1.avgScore_0).toBe(70);
  });

  it("handles brokers with undefined/empty weekly arrays without throwing", () => {
    const series: BrokerSeries[] = [
      { name: "A", weekly: undefined },
      { name: "B", weekly: [] },
      {
        name: "C",
        weekly: [{ weekStart: "2025-02-03", label: "03/02", meetings: 4, avgScore: 80 }],
      },
    ];
    const rows = mergeWeekly(series);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      weekStart: "2025-02-03",
      label: "03/02",
      meetings_0: null,
      avgScore_0: null,
      meetings_1: null,
      avgScore_1: null,
      meetings_2: 4,
      avgScore_2: 80,
    });
  });

});

// ─── Adaptive perf suite, parametrized by dataset size ──────────────────────
// Splitting into small / medium / large helps localize regressions:
//   - SMALL fails alone  → constant-overhead regression (Map alloc, sort cost)
//   - MEDIUM fails alone → mid-range scaling regression (gap handling, label map)
//   - LARGE  fails alone → asymptotic regression back to O(W·B·P)
// Each size has its OWN env-configurable budget so flakiness in one bucket
// can be tuned without weakening the others.
//
// Per-size env vars (UPPER):
//   MERGE_WEEKLY_PERF_BUDGET_MS_<SIZE>    per-call median ceiling (ms)
//   MERGE_WEEKLY_PERF_RATIO_<SIZE>        required naive/optimized speedup
//
// Global env vars (apply to every size unless overridden by the per-size var):
//   MERGE_WEEKLY_PERF_BUDGET_MS, MERGE_WEEKLY_PERF_RATIO
//   MERGE_WEEKLY_PERF_MIN_RUNS, MERGE_WEEKLY_PERF_MAX_RUNS
//   MERGE_WEEKLY_PERF_TARGET_RSE
//   CI=true → relaxes defaults
//   VERBOSE=1 → always print diagnostics

interface PerfSize {
  name: "small" | "medium" | "large";
  weeks: number;
  brokers: number;
  // Per-size defaults: tighter for small (overhead-only), looser for large.
  defaultBudgetLocalMs: number;
  defaultBudgetCIMs: number;
  defaultRatioLocal: number;
  defaultRatioCI: number;
}

const PERF_SIZES: PerfSize[] = [
  // Small: ~25 weeks × 3 brokers — should be sub-millisecond. Budget catches
  // overhead regressions (extra allocations, redundant sorts).
  {
    name: "small",
    weeks: 25,
    brokers: 3,
    defaultBudgetLocalMs: 5,
    defaultBudgetCIMs: 15,
    defaultRatioLocal: 1.05,
    defaultRatioCI: 1.0, // at small sizes ratio is dominated by overhead noise
  },
  // Medium: ~150 weeks × 6 brokers — typical "12-week × multi-broker" page load
  // amplified ~10× to make timing measurable.
  {
    name: "medium",
    weeks: 150,
    brokers: 6,
    defaultBudgetLocalMs: 20,
    defaultBudgetCIMs: 60,
    defaultRatioLocal: 1.2,
    defaultRatioCI: 1.05,
  },
  // Large: 800 weeks × 12 brokers — stress-test where the algorithmic win
  // (O(N+W·B) vs O(W·B·P)) dominates. Most likely to catch a true regression.
  {
    name: "large",
    weeks: 800,
    brokers: 12,
    defaultBudgetLocalMs: 75,
    defaultBudgetCIMs: 200,
    defaultRatioLocal: 1.2,
    defaultRatioCI: 1.05,
  },
];

describe("mergeWeekly — adaptive performance (per dataset size)", () => {
  const env = (typeof process !== "undefined" ? process.env : {}) ?? {};
  const isCI = env.CI === "true" || env.CI === "1";

  const num = (key: string, fallback: number): number => {
    const raw = env[key];
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  // Global knobs (shared across sizes — adaptive sampler config).
  const globalMinRuns = Math.max(3, Math.round(num("MERGE_WEEKLY_PERF_MIN_RUNS", 12)));
  const globalMaxRuns = Math.max(
    globalMinRuns,
    Math.round(num("MERGE_WEEKLY_PERF_MAX_RUNS", isCI ? 120 : 80))
  );
  const globalTargetRSE = num("MERGE_WEEKLY_PERF_TARGET_RSE", isCI ? 0.07 : 0.05);

  // Per-size loop — `it.each` keeps each size as its own test case so a
  // failure points directly at the offending bucket in the test output.
  it.each(PERF_SIZES)(
    "$name dataset stays within budget and beats naive impl",
    (sizeCfg) => {
      const SIZE = sizeCfg.name.toUpperCase();

      // Per-size override → global override → per-size CI/local default.
      const budgetMs = num(
        `MERGE_WEEKLY_PERF_BUDGET_MS_${SIZE}`,
        num(
          "MERGE_WEEKLY_PERF_BUDGET_MS",
          isCI ? sizeCfg.defaultBudgetCIMs : sizeCfg.defaultBudgetLocalMs
        )
      );
      const minRatio = num(
        `MERGE_WEEKLY_PERF_RATIO_${SIZE}`,
        num(
          "MERGE_WEEKLY_PERF_RATIO",
          isCI ? sizeCfg.defaultRatioCI : sizeCfg.defaultRatioLocal
        )
      );

      const series = makeSeries(sizeCfg.weeks, sizeCfg.brokers);

      // Delegate the noisy work (warm-up, interleaved sampling, RSE
      // convergence, median extraction) to the shared helper. The test
      // body only owns thresholds + assertions now.
      const { stats, iterations, stoppedEarly, ratioMedian } = adaptiveCompare(
        {
          optimized: () => mergeWeekly(series),
          naive: () => mergeWeeklyNaive(series),
        },
        "optimized",
        "naive",
        {
          minRuns: globalMinRuns,
          maxRuns: globalMaxRuns,
          targetRSE: globalTargetRSE,
        }
      );

      const opt = stats.optimized;
      const nai = stats.naive;
      const requiredOptimizedMaxMs = nai.median / minRatio;

      const diagnostics = [
        "",
        `  ── mergeWeekly perf [${sizeCfg.name}] (W=${sizeCfg.weeks}, B=${sizeCfg.brokers}) ──`,
        `  iterations                 : ${iterations} (min=${globalMinRuns}, max=${globalMaxRuns}, stoppedEarly=${stoppedEarly})`,
        `  optimized median           : ${fmt.ms(opt.median)}  RSE=${fmt.pct(opt.rse)}  min=${fmt.ms(opt.min)}  max=${fmt.ms(opt.max)}`,
        `  naive median               : ${fmt.ms(nai.median)}  RSE=${fmt.pct(nai.rse)}  min=${fmt.ms(nai.min)}  max=${fmt.ms(nai.max)}`,
        `  speedup (naive/optimized)  : ${ratioMedian.toFixed(2)}×  (median-based)`,
        "  ── thresholds ──",
        `  per-call budget            : ${budgetMs} ms  ${opt.median < budgetMs ? "✓" : "✗"}`,
        `  required min speedup       : ${minRatio.toFixed(2)}×  (optimized median must be < ${fmt.ms(requiredOptimizedMaxMs)})  ${opt.median < requiredOptimizedMaxMs ? "✓" : "✗"}`,
        `  target RSE                 : ${fmt.pct(globalTargetRSE)}  (opt=${fmt.pct(opt.rse)} ${opt.rse <= globalTargetRSE ? "✓" : "✗"}, nai=${fmt.pct(nai.rse)} ${nai.rse <= globalTargetRSE ? "✓" : "✗"})`,
        `  environment                : CI=${isCI}`,
        "  ── overrides for this size ──",
        `  MERGE_WEEKLY_PERF_BUDGET_MS_${SIZE}   per-call ceiling (ms)`,
        `  MERGE_WEEKLY_PERF_RATIO_${SIZE}       required min speedup`,
        "  (or use the global MERGE_WEEKLY_PERF_BUDGET_MS / _RATIO to apply to all sizes)",
        "",
      ].join("\n");

      if (env.VERBOSE === "1" || env.VERBOSE === "true") {
        // eslint-disable-next-line no-console
        console.log(diagnostics);
      }

      expect(opt.median, diagnostics).toBeLessThan(budgetMs);
      expect(opt.median, diagnostics).toBeLessThan(requiredOptimizedMaxMs);
    }
  );
});
