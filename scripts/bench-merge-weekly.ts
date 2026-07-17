/**
 * Local micro-benchmark for `mergeWeekly`.
 *
 * Run:
 *   npm run bench:merge-weekly
 *   # or directly:
 *   npx tsx scripts/bench-merge-weekly.ts [--json[=path]]
 *
 * Optional CLI flags:
 *   --json              write JSON artifact to ./bench-results/merge-weekly-<ts>.json
 *   --json=<path>       write JSON artifact to <path>
 *
 * Optional env vars:
 *   BENCH_RUNS=50            iterations per scenario (default 30)
 *   BENCH_WEEKS=800          weeks per series (default 800)
 *   BENCH_BROKERS=12         number of brokers (default 12)
 *   BENCH_GAP_MOD=10         every Nth week is a gap per broker (default 10)
 *   BENCH_BUDGET_MS=75       per-call median ceiling (ms)
 *   BENCH_MIN_RATIO=1.2      required naive/optimized speedup
 *   BENCH_JSON=<path>        same as --json=<path>
 *   VERBOSE=1                always print full diagnostic block
 *
 * Reports per-iteration timing (avg / p50 / p95 / min / max), throughput,
 * the optimized-vs-naive speedup ratio, and the resulting dataset size so
 * regressions in either runtime OR output shape are obvious at a glance.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  mergeWeekly,
  type BrokerSeries,
} from "../src/components/insights/MultiBrokerWeeklySparkline";
import { loadArtifact, type CanonicalArtifact } from "./bench-artifact-loader";

/**
 * Capture git metadata for traceability: every artifact links back to the
 * exact commit that produced its timings.
 *
 * Resolution order per field:
 *   1. Explicit env var (GIT_COMMIT / GIT_BRANCH / GIT_SHA) — set by CI
 *      providers (GitHub Actions, GitLab, CircleCI all expose at least one).
 *   2. CI-provider conventions (GITHUB_SHA, GITHUB_REF_NAME, etc.)
 *   3. Local `git` CLI fallback — works for dev runs in a checkout.
 *
 * Returns `null` for any field that cannot be resolved (e.g. tarball builds,
 * no git binary, detached HEAD with no branch). Never throws.
 */
export interface GitInfo {
  commit: string | null;       // Full 40-char SHA when available
  shortSha: string | null;     // 7-char abbreviation; useful for human display
  branch: string | null;       // Branch name; null on detached HEAD
  dirty: boolean | null;       // true if working tree has uncommitted changes
  source: "env" | "git" | "mixed" | "none"; // Where the data came from
}

function tryGit(args: string): string | null {
  try {
    const out = execSync(`git ${args}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      timeout: 1500,
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function captureGitInfo(): GitInfo {
  // 1. Env-var precedence — CI sets these without spawning git.
  const envCommit =
    process.env.GIT_COMMIT ||
    process.env.GIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CI_COMMIT_SHA ||           // GitLab
    process.env.CIRCLE_SHA1 ||             // CircleCI
    process.env.BITBUCKET_COMMIT ||        // Bitbucket
    null;
  const envBranch =
    process.env.GIT_BRANCH ||
    process.env.GITHUB_REF_NAME ||
    process.env.CI_COMMIT_REF_NAME ||      // GitLab
    process.env.CIRCLE_BRANCH ||           // CircleCI
    process.env.BITBUCKET_BRANCH ||        // Bitbucket
    null;

  // 2. Git CLI fallback.
  const gitCommit = envCommit ? null : tryGit("rev-parse HEAD");
  const gitBranch = envBranch ? null : tryGit("rev-parse --abbrev-ref HEAD");

  const commit = envCommit ?? gitCommit;
  const branch = envBranch ?? gitBranch;
  // Detached-HEAD reports "HEAD" — normalize to null so consumers don't treat
  // it as a real branch name.
  const branchNormalized = branch === "HEAD" ? null : branch;
  const shortSha = commit ? commit.slice(0, 7) : null;

  // Dirty check is git-only; skip if we have no working tree.
  let dirty: boolean | null = null;
  const status = tryGit("status --porcelain");
  if (status !== null) dirty = status.length > 0;

  let source: GitInfo["source"] = "none";
  if (envCommit && (gitCommit || gitBranch)) source = "mixed";
  else if (envCommit || envBranch) source = "env";
  else if (gitCommit || gitBranch) source = "git";

  return { commit, shortSha, branch: branchNormalized, dirty, source };
}

// ─── Naïve reference (kept in lock-step with tests) ─────────────────────────
function mergeWeeklyNaive(series: BrokerSeries[]) {
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
    const row: Record<string, string | number | null> = {
      weekStart,
      label: labelByKey.get(weekStart) ?? weekStart,
    };
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

// ─── Deterministic dataset generator ────────────────────────────────────────
function makeSeries(weeks: number, brokers: number, gapMod: number): BrokerSeries[] {
  const baseDate = new Date("2025-01-06T00:00:00Z").getTime();
  const weekKey = (i: number) => {
    const d = new Date(baseDate + i * 7 * 24 * 60 * 60 * 1000);
    return {
      weekStart: d.toISOString().slice(0, 10),
      label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  };
  return Array.from({ length: brokers }, (_, b) => {
    const weekly = [];
    for (let i = 0; i < weeks; i++) {
      if ((i + b) % gapMod === 0) continue;
      const { weekStart, label } = weekKey(i);
      const meetings = (i + b) % 7 === 0 ? 0 : 1 + ((i * (b + 1)) % 9);
      const avgScore = meetings === 0 ? 0 : 40 + ((i * 13 + b * 7) % 60);
      weekly.push({ weekStart, label, meetings, avgScore });
    }
    return { name: `Broker ${b + 1}`, weekly };
  });
}

// ─── Stats helpers ─────────────────────────────────────────────────────────
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(label: string, samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const avg = sum / samples.length;
  return {
    label,
    runs: samples.length,
    totalMs: sum,
    avgMs: avg,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    opsPerSec: 1000 / avg,
  };
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits).padStart(8);
}

function printTable(rows: ReturnType<typeof summarize>[]) {
  console.log(
    "  " +
      ["impl", "runs", "avg ms", "p50 ms", "p95 ms", "min ms", "max ms", "ops/s"]
        .map((h) => h.padStart(h === "impl" ? 12 : 8))
        .join("  ")
  );
  for (const r of rows) {
    console.log(
      "  " +
        [
          r.label.padStart(12),
          String(r.runs).padStart(8),
          fmt(r.avgMs),
          fmt(r.p50Ms),
          fmt(r.p95Ms),
          fmt(r.minMs),
          fmt(r.maxMs),
          fmt(r.opsPerSec, 1),
        ].join("  ")
    );
  }
}

// ─── Bench runner ──────────────────────────────────────────────────────────
function bench(label: string, fn: () => unknown, runs: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  return samples;
}

function approxBytes(value: unknown): number {
  // Rough JSON-serialized size — good enough to flag a shape regression.
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ─── --json-slim: shrink samplesMs for cheap CI run-history storage ────────
/**
 * Parsed slim mode. `kind: "full"` means write every sample (back-compat).
 * Other modes downsample or summarize so artifacts stay tiny across hundreds
 * of CI runs without losing the ability to recompute medians/p95 sanity
 * checks (we always retain min and max as anchor points).
 */
export type SlimMode =
  | { kind: "full" }
  | { kind: "omit" }
  | { kind: "downsample"; n: number }
  | { kind: "summary" };

/**
 * Parse a `--json-slim` / `BENCH_JSON_SLIM` value. Throws (process.exit) on
 * invalid input so a typo in CI surfaces immediately rather than silently
 * defaulting to "full" (which would defeat the point of asking for slim).
 */
export function parseSlimMode(raw: string | null): SlimMode {
  if (!raw) return { kind: "full" };
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "full") return { kind: "full" };
  if (v === "omit" || v === "none") return { kind: "omit" };
  if (v === "summary" || v === "5num") return { kind: "summary" };
  if (v.startsWith("downsample:") || v.startsWith("ds:")) {
    const num = Number(v.split(":")[1]);
    // Floor of 4 keeps min + max + 2 interior anchors so the kept array still
    // looks like a distribution, not a degenerate pair. Cap at 1024 because
    // beyond that the "slim" framing is a lie.
    if (!Number.isFinite(num) || num < 4 || num > 1024) {
      console.error(
        `✗ --json-slim=downsample:N requires 4 ≤ N ≤ 1024 (got "${raw}")`
      );
      process.exit(2);
    }
    return { kind: "downsample", n: Math.floor(num) };
  }
  console.error(
    `✗ unknown --json-slim mode "${raw}"; expected: full | omit | downsample:N | summary`
  );
  process.exit(2);
}

/**
 * Apply a slim mode to a sample array. Returns the kept samples plus metadata
 * so the artifact reader knows it's looking at a downsampled view (and the
 * loader's "samplesMs.length === config.runs" invariant can be relaxed).
 *
 * Invariants:
 *   - "full"        → samples returned verbatim, meta.kind = "full"
 *   - "omit"        → empty array, meta.kind = "omit"
 *   - "downsample"  → ≤ n entries, ALWAYS includes min and max of original
 *   - "summary"     → exactly 5 entries: [min, p25, p50, p75, max]
 */
export function applySlim(
  samples: number[],
  mode: SlimMode
): { kept: number[]; meta: { kind: SlimMode["kind"]; originalLength: number; kept: number } } {
  const meta = (kind: SlimMode["kind"], kept: number) => ({
    kind,
    originalLength: samples.length,
    kept,
  });
  if (mode.kind === "full" || samples.length === 0) {
    return { kept: samples, meta: meta("full", samples.length) };
  }
  if (mode.kind === "omit") {
    return { kept: [], meta: meta("omit", 0) };
  }
  // For downsample/summary we want ORIGINAL min/max preserved exactly, so
  // sort once and pull anchors from the sorted view. Sampling indices are
  // computed against the sorted view too: keeping evenly-spaced quantiles
  // gives a distribution-shape-preserving slim, not a chronological one.
  // (We don't need chronological order for percentile/median recompute.)
  const sorted = [...samples].sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];

  if (mode.kind === "summary") {
    const pick = (p: number) =>
      sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
    const kept = [lo, pick(0.25), pick(0.5), pick(0.75), hi];
    return { kept, meta: meta("summary", kept.length) };
  }

  // downsample:N — N evenly-spaced quantile picks; first/last are forced to
  // exact min/max so future sanity checks (`min ≤ median ≤ max`) hold even
  // if the picked indices land just inside the extremes due to rounding.
  const n = Math.min(mode.n, sorted.length);
  if (n >= sorted.length) {
    return { kept: sorted, meta: meta("downsample", sorted.length) };
  }
  const kept: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // Evenly-spaced over [0, sorted.length-1].
    const idx = Math.round((i * (sorted.length - 1)) / (n - 1));
    kept[i] = sorted[idx];
  }
  // Defensive: clamp endpoints in case of rounding drift on tiny n.
  kept[0] = lo;
  kept[n - 1] = hi;
  return { kept, meta: meta("downsample", n) };
}

// ─── --json-diff implementation ─────────────────────────────────────────────
// Compares two artifacts (loaded through the schema-aware loader so v1/v2/…
// files are auto-migrated) and reports:
//   • absolute + % delta on optimized/naive median and p95
//   • absolute delta on the speedup (median naive÷optimized)
//   • which of the candidate's CLAIMED thresholds it actually breached, and
//     whether it ALSO breaches the BASELINE's stricter threshold (catches
//     a regression that was hidden by relaxing the budget between runs)
//
// Exit code: 0 = healthy, 1 = regression detected, 2 = bad invocation/load.
//
// Tunable via env (sensible defaults so CI doesn't need any config):
//   BENCH_DIFF_MEDIAN_PCT=10   median % slower => regression
//   BENCH_DIFF_P95_PCT=15      p95    % slower => regression
//   BENCH_DIFF_RATIO_DROP=0.5  speedup drop in absolute × => regression
/**
 * Structured shape of the diff result. Mirrors the human-readable report 1:1
 * so a CI script can reach the same verdict by reading either format.
 * Bumped via `schemaVersion` independently of the bench artifact schema —
 * downstream consumers can pin to a specific diff schema without coupling
 * to the bench's own evolution.
 */
export interface DiffArtifact {
  schemaVersion: 1;
  kind: "mergeWeekly-diff";
  generatedAt: string;
  baseline: {
    path: string;
    rawSchemaVersion: number;
    startedAt: string;
    status: string;
    /** Git metadata of the baseline run, when present in the artifact. */
    git?: NonNullable<CanonicalArtifact["env"]["git"]> | null;
  };
  candidate: {
    path: string;
    rawSchemaVersion: number;
    startedAt: string;
    status: string;
    git?: NonNullable<CanonicalArtifact["env"]["git"]> | null;
  };
  /** Convenience top-level summary of git context for quick scanning. */
  gitContext?: {
    sameCommit: boolean;
    commitRange: string | null; // `git log` invocation when SHAs differ
    baselineDirty: boolean | null;
    candidateDirty: boolean | null;
  };
  config: {
    sameScale: boolean;
    baseline: { weeks: number; brokers: number; gapMod: number; runs: number };
    candidate: { weeks: number; brokers: number; gapMod: number; runs: number };
  };
  limits: { medianPct: number; p95Pct: number; ratioDrop: number };
  deltas: {
    optimized: {
      median: { baselineMs: number; candidateMs: number; deltaMs: number; deltaPct: number };
      p95: { baselineMs: number; candidateMs: number; deltaMs: number; deltaPct: number };
    };
    naive: {
      median: { baselineMs: number; candidateMs: number; deltaMs: number; deltaPct: number };
      p95: { baselineMs: number; candidateMs: number; deltaMs: number; deltaPct: number };
    };
    speedup: { baseline: number; candidate: number; deltaAbs: number };
    rows: { baseline: number | null; candidate: number | null };
    shapeMatches: { baseline: boolean | null; candidate: boolean | null };
  };
  thresholdBreaches: {
    candidateOwnBudget: { breached: boolean; budgetMs: number; observedMs: number };
    candidateOwnRatio: { breached: boolean; minRatio: number; observedRatio: number };
    baselineBudgetVsCandidate: {
      breached: boolean;
      budgetMs: number;
      observedMs: number;
      thresholdsRelaxed: boolean;
    };
    baselineRatioVsCandidate: {
      breached: boolean;
      minRatio: number;
      observedRatio: number;
      thresholdsRelaxed: boolean;
    };
  };
  checks: Array<{ id: string; label: string; passed: boolean; detail: string }>;
  verdict: { passed: boolean; failedChecks: string[]; exitCode: 0 | 1 };
}

function pct(curr: number, prev: number): number {
  return prev === 0 ? 0 : ((curr - prev) / prev) * 100;
}

function fmtDelta(curr: number, prev: number, unit = "ms", digits = 3): string {
  const d = curr - prev;
  const p = pct(curr, prev);
  const sign = d >= 0 ? "+" : "";
  const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "·";
  return `${prev.toFixed(digits)}${unit} → ${curr.toFixed(digits)}${unit}  (${sign}${d.toFixed(digits)}${unit}, ${sign}${p.toFixed(1)}%) ${arrow}`;
}

async function runJsonDiff(
  baselinePath: string,
  candidatePath: string,
  diffJsonPath: string | null = null
): Promise<number> {
  let base, cand;
  try {
    base = loadArtifact(baselinePath);
    cand = loadArtifact(candidatePath);
  } catch (err) {
    console.error(`✗ failed to load artifacts: ${(err as Error).message}`);
    return 2;
  }

  const a: CanonicalArtifact = base.artifact;
  const b: CanonicalArtifact = cand.artifact;

  console.log("\n▶ mergeWeekly bench — JSON diff");
  const fmtGit = (art: CanonicalArtifact) => {
    const g = art.env?.git;
    if (!g) return "git=(unknown)";
    return `git=${g.shortSha ?? "(unknown)"}${g.dirty ? "-dirty" : ""}/${g.branch ?? "(detached)"}`;
  };
  console.log(`  baseline : ${base.path}`);
  console.log(`             v${base.rawSchemaVersion}  ${a.startedAt}  status=${a.status ?? "(legacy)"}  ${fmtGit(a)}`);
  console.log(`  candidate: ${cand.path}`);
  console.log(`             v${cand.rawSchemaVersion}  ${b.startedAt}  status=${b.status ?? "(legacy)"}  ${fmtGit(b)}`);
  // Quick reachability hint: if both artifacts have full SHAs, give the user
  // a one-shot `git log` invocation to see what changed between them.
  if (a.env?.git?.commit && b.env?.git?.commit && a.env.git.commit !== b.env.git.commit) {
    console.log(`             commit range: git log --oneline ${a.env.git.commit}..${b.env.git.commit}`);
  } else if (a.env?.git?.commit && a.env.git.commit === b.env?.git?.commit) {
    console.log(`             ⚠ both artifacts share the same commit (${a.env.git.shortSha}) — timing diff reflects environmental noise, not code changes`);
  }
  console.log("");

  // Refuse to proceed on crash artifacts — there's nothing to compare.
  if (a.status === "crashed" || b.status === "crashed") {
    console.error(
      `✗ one of the artifacts is a CRASH artifact (baseline=${a.status}, candidate=${b.status}). No timings to diff.`
    );
    return 2;
  }
  if (!a.timings || !b.timings || !a.config || !b.config || !a.thresholds || !b.thresholds) {
    console.error("✗ artifact is missing timings/config/thresholds — cannot diff.");
    return 2;
  }

  // Scale check: comparing W=25 vs W=800 is meaningless. Warn loudly but
  // still print the numbers so the user can at least see the shape of the
  // change (sometimes intentional, e.g. local quick run vs CI run).
  const sameScale =
    a.config.weeks === b.config.weeks &&
    a.config.brokers === b.config.brokers &&
    a.config.gapMod === b.config.gapMod &&
    a.config.runs === b.config.runs;
  if (!sameScale) {
    console.warn("  ⚠ config scale differs — timings are NOT directly comparable:");
    console.warn(
      `    baseline : weeks=${a.config.weeks} brokers=${a.config.brokers} gapMod=${a.config.gapMod} runs=${a.config.runs}`
    );
    console.warn(
      `    candidate: weeks=${b.config.weeks} brokers=${b.config.brokers} gapMod=${b.config.gapMod} runs=${b.config.runs}\n`
    );
  }

  const medianPctLimit = num("BENCH_DIFF_MEDIAN_PCT", 10);
  const p95PctLimit = num("BENCH_DIFF_P95_PCT", 15);
  const ratioDropLimit = num("BENCH_DIFF_RATIO_DROP", 0.5);

  console.log("  timings (baseline → candidate):");
  console.log(`    optimized median : ${fmtDelta(b.timings.optimized.medianMs, a.timings.optimized.medianMs)}`);
  console.log(`    optimized p95    : ${fmtDelta(b.timings.optimized.p95Ms, a.timings.optimized.p95Ms)}`);
  console.log(`    naive     median : ${fmtDelta(b.timings.naive.medianMs, a.timings.naive.medianMs)}`);
  console.log(`    naive     p95    : ${fmtDelta(b.timings.naive.p95Ms, a.timings.naive.p95Ms)}`);
  console.log(
    `    speedup (median) : ${a.timings.speedup.median.toFixed(2)}× → ${b.timings.speedup.median.toFixed(2)}×  (${
      b.timings.speedup.median - a.timings.speedup.median >= 0 ? "+" : ""
    }${(b.timings.speedup.median - a.timings.speedup.median).toFixed(2)}×)`
  );
  console.log(
    `    rows             : ${a.output?.rows ?? "?"} → ${b.output?.rows ?? "?"}  (shape match: base=${a.output?.shapeMatches ?? "?"}, cand=${b.output?.shapeMatches ?? "?"})\n`
  );

  // ─── Regression checks ─────────────────────────────────────────────────
  // Each entry records what was checked AND a stable `id` so machine consumers
  // can pin behavior to specific checks across diff-schema bumps.
  type Check = { id: string; label: string; passed: boolean; detail: string };
  const checks: Check[] = [];

  // Median regression
  const medPct = pct(b.timings.optimized.medianMs, a.timings.optimized.medianMs);
  checks.push({
    id: "optimized_median_pct",
    label: `optimized median ≤ +${medianPctLimit}% vs baseline`,
    passed: medPct <= medianPctLimit,
    detail: `${medPct >= 0 ? "+" : ""}${medPct.toFixed(1)}% (limit +${medianPctLimit}%)`,
  });

  // p95 regression — catches tail latency that median hides
  const p95Pct = pct(b.timings.optimized.p95Ms, a.timings.optimized.p95Ms);
  checks.push({
    id: "optimized_p95_pct",
    label: `optimized p95 ≤ +${p95PctLimit}% vs baseline`,
    passed: p95Pct <= p95PctLimit,
    detail: `${p95Pct >= 0 ? "+" : ""}${p95Pct.toFixed(1)}% (limit +${p95PctLimit}%)`,
  });

  // Speedup drop
  const ratioDelta = b.timings.speedup.median - a.timings.speedup.median;
  checks.push({
    id: "speedup_drop_abs",
    label: `speedup drop ≤ ${ratioDropLimit}× vs baseline`,
    passed: ratioDelta >= -ratioDropLimit,
    detail: `${ratioDelta >= 0 ? "+" : ""}${ratioDelta.toFixed(2)}× (limit −${ratioDropLimit}×)`,
  });

  // Shape parity must hold across runs
  if (a.output && b.output) {
    checks.push({
      id: "output_shape_parity",
      label: "output shape parity preserved",
      passed: a.output.shapeMatches === b.output.shapeMatches && b.output.shapeMatches,
      detail: `base=${a.output.shapeMatches}, cand=${b.output.shapeMatches}`,
    });
  }

  // ─── Threshold breach analysis ─────────────────────────────────────────
  // Two angles:
  //  (1) Did candidate breach ITS OWN claimed thresholds? (matches its verdict.)
  //  (2) Did candidate breach the BASELINE's thresholds? (catches the
  //      "loosened-the-budget-to-make-it-green" anti-pattern.)
  const candBudgetBreached = b.timings.optimized.medianMs >= b.thresholds.budgetMs;
  const candRatioBreached = b.timings.speedup.median < b.thresholds.minRatio;
  const baseBudgetBreached = b.timings.optimized.medianMs >= a.thresholds.budgetMs;
  const baseRatioBreached = b.timings.speedup.median < a.thresholds.minRatio;
  const budgetRelaxed =
    a.thresholds.budgetMs !== b.thresholds.budgetMs && b.thresholds.budgetMs > a.thresholds.budgetMs;
  const ratioRelaxed =
    a.thresholds.minRatio !== b.thresholds.minRatio && b.thresholds.minRatio < a.thresholds.minRatio;

  console.log("  threshold check:");
  const fmtThresh = (label: string, breached: boolean, detail: string) =>
    `    ${breached ? "✗" : "✓"} ${label}: ${detail}`;
  console.log(
    fmtThresh(
      "candidate vs its own budget",
      candBudgetBreached,
      `optimized median ${b.timings.optimized.medianMs.toFixed(3)}ms ${candBudgetBreached ? "≥" : "<"} ${b.thresholds.budgetMs}ms`
    )
  );
  console.log(
    fmtThresh(
      "candidate vs its own minRatio",
      candRatioBreached,
      `speedup ${b.timings.speedup.median.toFixed(2)}× ${candRatioBreached ? "<" : "≥"} ${b.thresholds.minRatio}×`
    )
  );
  if (a.thresholds.budgetMs !== b.thresholds.budgetMs) {
    console.log(
      fmtThresh(
        `candidate vs BASELINE's budget (${a.thresholds.budgetMs}ms)`,
        baseBudgetBreached,
        `optimized median ${b.timings.optimized.medianMs.toFixed(3)}ms ${baseBudgetBreached ? "≥" : "<"} ${a.thresholds.budgetMs}ms ${
          baseBudgetBreached && !candBudgetBreached ? "  ⚠ thresholds were RELAXED between runs" : ""
        }`
      )
    );
  }
  if (a.thresholds.minRatio !== b.thresholds.minRatio) {
    console.log(
      fmtThresh(
        `candidate vs BASELINE's minRatio (${a.thresholds.minRatio}×)`,
        baseRatioBreached,
        `speedup ${b.timings.speedup.median.toFixed(2)}× ${baseRatioBreached ? "<" : "≥"} ${a.thresholds.minRatio}× ${
          baseRatioBreached && !candRatioBreached ? "  ⚠ thresholds were RELAXED between runs" : ""
        }`
      )
    );
  }

  // Fold the threshold breaches into the unified check list.
  if (candBudgetBreached) {
    checks.push({ id: "candidate_own_budget", label: "candidate budget threshold", passed: false, detail: "see above" });
  }
  if (candRatioBreached) {
    checks.push({ id: "candidate_own_ratio", label: "candidate minRatio threshold", passed: false, detail: "see above" });
  }
  if (baseBudgetBreached && !candBudgetBreached) {
    checks.push({
      id: "baseline_budget_vs_candidate",
      label: "candidate would FAIL baseline's stricter budget",
      passed: false,
      detail: "thresholds were relaxed",
    });
  }
  if (baseRatioBreached && !candRatioBreached) {
    checks.push({
      id: "baseline_ratio_vs_candidate",
      label: "candidate would FAIL baseline's stricter minRatio",
      passed: false,
      detail: "thresholds were relaxed",
    });
  }

  // ─── Final verdict ─────────────────────────────────────────────────────
  const failed = checks.filter((c) => !c.passed);
  console.log("\n  summary:");
  for (const c of checks) console.log(`    ${c.passed ? "✓" : "✗"} ${c.label} — ${c.detail}`);
  const exitCode: 0 | 1 = failed.length === 0 ? 0 : 1;
  if (exitCode === 0) {
    console.log("\n  verdict: ✓ no regression detected\n");
  } else {
    console.error(
      `\n  verdict: ✗ ${failed.length} regression${failed.length === 1 ? "" : "s"} detected — see ✗ rows above\n`
    );
  }

  // ─── Machine-readable diff artifact ───────────────────────────────────
  // Same data the human report shows, structured so a CI step can:
  //   • assert specific check.id values failed (stable across schema bumps)
  //   • feed deltas into a trend dashboard without re-parsing console output
  //   • detect threshold-relaxation independently from raw failure status
  if (diffJsonPath) {
    const optMed = b.timings.optimized.medianMs - a.timings.optimized.medianMs;
    const optP95 = b.timings.optimized.p95Ms - a.timings.optimized.p95Ms;
    const naiMed = b.timings.naive.medianMs - a.timings.naive.medianMs;
    const naiP95 = b.timings.naive.p95Ms - a.timings.naive.p95Ms;
    const diffArtifact: DiffArtifact = {
      schemaVersion: 1,
      kind: "mergeWeekly-diff",
      generatedAt: new Date().toISOString(),
      baseline: {
        path: base.path,
        rawSchemaVersion: base.rawSchemaVersion,
        startedAt: a.startedAt,
        status: a.status ?? "(legacy)",
        git: a.env?.git ?? null,
      },
      candidate: {
        path: cand.path,
        rawSchemaVersion: cand.rawSchemaVersion,
        startedAt: b.startedAt,
        status: b.status ?? "(legacy)",
        git: b.env?.git ?? null,
      },
      gitContext: {
        sameCommit:
          !!a.env?.git?.commit &&
          !!b.env?.git?.commit &&
          a.env.git.commit === b.env.git.commit,
        commitRange:
          a.env?.git?.commit && b.env?.git?.commit && a.env.git.commit !== b.env.git.commit
            ? `git log --oneline ${a.env.git.commit}..${b.env.git.commit}`
            : null,
        baselineDirty: a.env?.git?.dirty ?? null,
        candidateDirty: b.env?.git?.dirty ?? null,
      },
      config: { sameScale, baseline: a.config, candidate: b.config },
      limits: { medianPct: medianPctLimit, p95Pct: p95PctLimit, ratioDrop: ratioDropLimit },
      deltas: {
        optimized: {
          median: {
            baselineMs: a.timings.optimized.medianMs,
            candidateMs: b.timings.optimized.medianMs,
            deltaMs: optMed,
            deltaPct: medPct,
          },
          p95: {
            baselineMs: a.timings.optimized.p95Ms,
            candidateMs: b.timings.optimized.p95Ms,
            deltaMs: optP95,
            deltaPct: p95Pct,
          },
        },
        naive: {
          median: {
            baselineMs: a.timings.naive.medianMs,
            candidateMs: b.timings.naive.medianMs,
            deltaMs: naiMed,
            deltaPct: pct(b.timings.naive.medianMs, a.timings.naive.medianMs),
          },
          p95: {
            baselineMs: a.timings.naive.p95Ms,
            candidateMs: b.timings.naive.p95Ms,
            deltaMs: naiP95,
            deltaPct: pct(b.timings.naive.p95Ms, a.timings.naive.p95Ms),
          },
        },
        speedup: {
          baseline: a.timings.speedup.median,
          candidate: b.timings.speedup.median,
          deltaAbs: ratioDelta,
        },
        rows: { baseline: a.output?.rows ?? null, candidate: b.output?.rows ?? null },
        shapeMatches: {
          baseline: a.output?.shapeMatches ?? null,
          candidate: b.output?.shapeMatches ?? null,
        },
      },
      thresholdBreaches: {
        candidateOwnBudget: {
          breached: candBudgetBreached,
          budgetMs: b.thresholds.budgetMs,
          observedMs: b.timings.optimized.medianMs,
        },
        candidateOwnRatio: {
          breached: candRatioBreached,
          minRatio: b.thresholds.minRatio,
          observedRatio: b.timings.speedup.median,
        },
        baselineBudgetVsCandidate: {
          breached: baseBudgetBreached,
          budgetMs: a.thresholds.budgetMs,
          observedMs: b.timings.optimized.medianMs,
          thresholdsRelaxed: budgetRelaxed,
        },
        baselineRatioVsCandidate: {
          breached: baseRatioBreached,
          minRatio: a.thresholds.minRatio,
          observedRatio: b.timings.speedup.median,
          thresholdsRelaxed: ratioRelaxed,
        },
      },
      checks,
      verdict: {
        passed: exitCode === 0,
        failedChecks: failed.map((c) => c.id),
        exitCode,
      },
    };

    const resolvedPath =
      diffJsonPath === "default"
        ? resolve(`bench-results/diff-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
        : resolve(diffJsonPath);
    try {
      mkdirSync(dirname(resolvedPath), { recursive: true });
      writeFileSync(resolvedPath, JSON.stringify(diffArtifact, null, 2) + "\n", "utf8");
      console.log(`  diff json      : ${resolvedPath}\n`);
    } catch (err) {
      console.error(
        `  ⚠ failed to write diff JSON to ${resolvedPath}: ${(err as Error).message}`
      );
      // Don't override the regression verdict on a write failure.
    }
  }

  return exitCode;
}


async function main() {
  // ─── CLI parsing ────────────────────────────────────────────────────────
  // Supports `--json` (default path) or `--json=<path>` (custom path).
  // Env var BENCH_JSON works the same way for non-interactive use (e.g. CI).
  // The artifact contains every field needed to compare runs over time:
  // config, env snapshot, raw + summary timings, computed thresholds, verdict.
  const argv = process.argv.slice(2);
  let jsonPath: string | null = null;
  let diffPair: { baseline: string; candidate: string } | null = null;
  // `--diff-json[=path]` writes the structured diff result alongside the
  // human-readable report. Resolved AFTER the loop so it pairs with whichever
  // form of --json-diff the user picked.
  let diffJsonOut: string | null = null;
  // `--json-slim[=mode]` controls how `samplesMs` is stored in the artifact.
  // Goal: keep CI run-history JSONs small (1 run × 30 samples × 2 impls is
  // tiny, but BENCH_RUNS=10000 across hundreds of runs balloons quickly).
  // Modes:
  //   "full"           — default; store every sample (back-compat).
  //   "omit"           — drop samplesMs entirely; medians/p95 still present.
  //   "downsample:<N>" — keep N evenly-spaced samples PLUS min and max so
  //                      shape is preserved and percentile sanity checks
  //                      still work. Bare --json-slim → "downsample:32".
  //   "summary"        — keep only 5-point summary (min/p25/p50/p75/max);
  //                      most aggressive without losing distribution shape.
  let jsonSlimRaw: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") jsonPath = "default";
    else if (arg.startsWith("--json=")) jsonPath = arg.slice("--json=".length).trim() || "default";
    else if (arg === "--json-slim") jsonSlimRaw = "downsample:32";
    else if (arg.startsWith("--json-slim=")) jsonSlimRaw = arg.slice("--json-slim=".length).trim() || "downsample:32";
    else if (arg === "--json-diff") {
      // Form: --json-diff <baseline> <candidate>
      const baseline = argv[i + 1];
      const candidate = argv[i + 2];
      if (!baseline || !candidate || baseline.startsWith("-") || candidate.startsWith("-")) {
        console.error("✗ --json-diff requires two paths: --json-diff <baseline.json> <candidate.json>");
        process.exit(2);
      }
      diffPair = { baseline, candidate };
      i += 2;
    } else if (arg.startsWith("--json-diff=")) {
      // Form: --json-diff=<baseline>,<candidate> (CI-friendly single arg).
      const [b, c] = arg.slice("--json-diff=".length).split(",");
      if (!b || !c) {
        console.error("✗ --json-diff=<baseline>,<candidate> requires both paths separated by a comma");
        process.exit(2);
      }
      diffPair = { baseline: b, candidate: c };
    } else if (arg === "--diff-json") {
      diffJsonOut = "default";
    } else if (arg.startsWith("--diff-json=")) {
      diffJsonOut = arg.slice("--diff-json=".length).trim() || "default";
    } else if (arg === "-h" || arg === "--help") {
      console.log("Usage: tsx scripts/bench-merge-weekly.ts [--json[=path]] [--json-slim[=mode]]");
      console.log("       tsx scripts/bench-merge-weekly.ts --json-diff <baseline> <candidate> [--diff-json[=path]]");
      console.log("Slim modes: full | omit | downsample:N (default 32) | summary");
      console.log("Env: BENCH_RUNS, BENCH_WEEKS, BENCH_BROKERS, BENCH_GAP_MOD,");
      console.log("     BENCH_BUDGET_MS, BENCH_MIN_RATIO, BENCH_JSON, BENCH_JSON_SLIM, VERBOSE=1");
      console.log("     BENCH_DIFF_MEDIAN_PCT (default 10), BENCH_DIFF_P95_PCT (default 15)");
      console.log("     BENCH_DIFF_RATIO_DROP (default 0.5), BENCH_DIFF_JSON=<path>");
      process.exit(0);
    }
  }
  if (!jsonPath && process.env.BENCH_JSON) {
    jsonPath = process.env.BENCH_JSON.trim() || "default";
  }
  if (!jsonSlimRaw && process.env.BENCH_JSON_SLIM) {
    jsonSlimRaw = process.env.BENCH_JSON_SLIM.trim() || "downsample:32";
  }
  if (!diffJsonOut && process.env.BENCH_DIFF_JSON) {
    diffJsonOut = process.env.BENCH_DIFF_JSON.trim() || "default";
  }

  // Parse + validate slim mode once, fail fast on typos so a CI cron doesn't
  // silently keep writing fat artifacts because someone typo'd "downsamp:32".
  const slimMode = parseSlimMode(jsonSlimRaw);

  // ─── --json-diff short-circuit ──────────────────────────────────────────
  // Skip the bench entirely: load two existing artifacts via the schema-aware
  // loader, compare median/p95, highlight which thresholds the candidate
  // breached, and exit non-zero if a regression is detected. Keeps CI logs
  // self-contained — no need to re-run the bench just to interpret old JSONs.
  if (diffPair) {
    const exitCode = await runJsonDiff(diffPair.baseline, diffPair.candidate, diffJsonOut);
    process.exit(exitCode);
  }
  if (diffJsonOut) {
    // --diff-json only makes sense with --json-diff. Surface the misuse early.
    console.warn("  ⚠ --diff-json was provided without --json-diff; ignoring (the bench itself doesn't produce a diff).");
  }

  const RUNS = Math.max(1, Math.round(num("BENCH_RUNS", 30)));
  const WEEKS = Math.max(1, Math.round(num("BENCH_WEEKS", 800)));
  const BROKERS = Math.max(1, Math.round(num("BENCH_BROKERS", 12)));
  const GAP_MOD = Math.max(2, Math.round(num("BENCH_GAP_MOD", 10)));

  // Pass/fail thresholds — match the test suite defaults so a green bench
  // implies a green test (large bucket). Override via env to mirror CI.
  const BUDGET_MS = num("BENCH_BUDGET_MS", 75); // per-call median ceiling
  const MIN_RATIO = num("BENCH_MIN_RATIO", 1.2); // naive/optimized speedup

  // Capture git metadata ONCE at the start of the timed section, so a long
  // run that spans a `git checkout` still attributes timings to the revision
  // we actually benchmarked (not whatever HEAD points to at write time).
  const gitInfo = captureGitInfo();

  // ─── Env snapshot ─────────────────────────────────────────────────────────
  // Capture the EXACT effective value of every knob the bench AND the
  // companion vitest perf suite recognize, plus whether each one was
  // explicitly set or defaulted. Reused in the diagnostics block and to
  // build a one-line reproduce command.
  const trackedEnv = [
    // Bench-only knobs (with their effective parsed values).
    { key: "BENCH_RUNS", effective: String(RUNS), default: "30" },
    { key: "BENCH_WEEKS", effective: String(WEEKS), default: "800" },
    { key: "BENCH_BROKERS", effective: String(BROKERS), default: "12" },
    { key: "BENCH_GAP_MOD", effective: String(GAP_MOD), default: "10" },
    { key: "BENCH_BUDGET_MS", effective: String(BUDGET_MS), default: "75" },
    { key: "BENCH_MIN_RATIO", effective: MIN_RATIO.toFixed(2), default: "1.20" },
    // Cross-cutting knobs that influence the related vitest perf suite —
    // shown here so a single snapshot reproduces both.
    { key: "CI", effective: process.env.CI ?? "(unset)", default: "(unset)" },
    { key: "VERBOSE", effective: process.env.VERBOSE ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_BUDGET_MS", effective: process.env.MERGE_WEEKLY_PERF_BUDGET_MS ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_RATIO", effective: process.env.MERGE_WEEKLY_PERF_RATIO ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_MIN_RUNS", effective: process.env.MERGE_WEEKLY_PERF_MIN_RUNS ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_MAX_RUNS", effective: process.env.MERGE_WEEKLY_PERF_MAX_RUNS ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_TARGET_RSE", effective: process.env.MERGE_WEEKLY_PERF_TARGET_RSE ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_BUDGET_MS_SMALL", effective: process.env.MERGE_WEEKLY_PERF_BUDGET_MS_SMALL ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_BUDGET_MS_MEDIUM", effective: process.env.MERGE_WEEKLY_PERF_BUDGET_MS_MEDIUM ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_BUDGET_MS_LARGE", effective: process.env.MERGE_WEEKLY_PERF_BUDGET_MS_LARGE ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_RATIO_SMALL", effective: process.env.MERGE_WEEKLY_PERF_RATIO_SMALL ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_RATIO_MEDIUM", effective: process.env.MERGE_WEEKLY_PERF_RATIO_MEDIUM ?? "(unset)", default: "(unset)" },
    { key: "MERGE_WEEKLY_PERF_RATIO_LARGE", effective: process.env.MERGE_WEEKLY_PERF_RATIO_LARGE ?? "(unset)", default: "(unset)" },
  ] as const;

  const envRows = trackedEnv.map((e) => {
    const isSet = process.env[e.key] !== undefined && process.env[e.key] !== "";
    const tag = isSet ? "(set)    " : "(default)";
    const padKey = e.key.padEnd(36, " ");
    return `    ${padKey} = ${e.effective.padEnd(10)} ${tag}`;
  });

  // Build a copy-pasteable reproduce command from ONLY the env vars that
  // were explicitly set — keeps the line short and faithful to what the
  // user actually had in their shell.
  const setEnvAssignments = trackedEnv
    .filter((e) => process.env[e.key] !== undefined && process.env[e.key] !== "")
    .map((e) => `${e.key}=${process.env[e.key]}`);
  const reproduceCmd =
    setEnvAssignments.length > 0
      ? `${setEnvAssignments.join(" ")} npm run bench:merge-weekly`
      : "npm run bench:merge-weekly  # all defaults — no env vars set";

  console.log("\n▶ mergeWeekly micro-benchmark");
  console.log(`  config: weeks=${WEEKS}  brokers=${BROKERS}  gapMod=${GAP_MOD}  runs=${RUNS}`);
  console.log(`  thresholds: budget=${BUDGET_MS}ms/call  minSpeedup=${MIN_RATIO.toFixed(2)}×`);
  console.log(`  node:   ${process.version}  platform=${process.platform}/${process.arch}`);
  console.log(
    `  git:    ${gitInfo.shortSha ?? "(unknown)"}${gitInfo.dirty ? "-dirty" : ""}` +
      `  branch=${gitInfo.branch ?? "(detached/unknown)"}  source=${gitInfo.source}`
  );
  console.log(`  CI=${process.env.CI ?? "(unset)"}  VERBOSE=${process.env.VERBOSE ?? "(unset)"}\n`);

  // ─── Override coherence validation ──────────────────────────────────────
  // The vitest perf suite uses MERGE_WEEKLY_PERF_* overrides scaled for its
  // 3 baked-in dataset sizes (small W=25/B=3, medium W=150/B=6, large W=800/B=12).
  // The bench uses arbitrary BENCH_WEEKS/BENCH_BROKERS. If the user pins a
  // perf override expecting one scale and runs the bench at a very different
  // scale, the override is misleading. We don't fail — just warn loudly.
  //
  // Reference points (median ms on a typical local machine):
  //   small ≈ 0.05 ms/call   medium ≈ 0.5 ms/call   large ≈ 5 ms/call
  // Cost scales roughly linearly with WEEKS × BROKERS.
  const SMALL_WB = 25 * 3;
  const LARGE_WB = 800 * 12;
  const benchScale = WEEKS * BROKERS;
  const benchVsSmall = benchScale / SMALL_WB;
  const benchVsLarge = benchScale / LARGE_WB;

  const overrideBudget = process.env.MERGE_WEEKLY_PERF_BUDGET_MS;
  const overrideRatio = process.env.MERGE_WEEKLY_PERF_RATIO;

  const warnings: string[] = [];

  if (overrideBudget !== undefined) {
    const v = Number(overrideBudget);
    if (!Number.isFinite(v) || v <= 0) {
      warnings.push(
        `MERGE_WEEKLY_PERF_BUDGET_MS="${overrideBudget}" is not a positive number — the perf test will ignore it and fall back to defaults.`
      );
    } else {
      // Tighter than ~5ms forces the LARGE bucket (~5ms baseline) to fail.
      if (v < 5 && benchVsLarge >= 0.5) {
        warnings.push(
          `MERGE_WEEKLY_PERF_BUDGET_MS=${v}ms is TOO STRICT for the large bucket — the optimized impl typically runs ~5-10 ms/call there. Expect false positives.`
        );
      }
      if (v > 1000) {
        warnings.push(
          `MERGE_WEEKLY_PERF_BUDGET_MS=${v}ms is TOO LAX — even an O(W·B·P) regression would fit under it. The perf test becomes a no-op.`
        );
      }
      // Coherence with bench's own knob.
      const benchBudgetSet = process.env.BENCH_BUDGET_MS !== undefined;
      if (benchBudgetSet && Math.abs(v - BUDGET_MS) / BUDGET_MS > 2) {
        warnings.push(
          `MERGE_WEEKLY_PERF_BUDGET_MS=${v}ms diverges by >2× from BENCH_BUDGET_MS=${BUDGET_MS}ms — the bench and the perf test will disagree on what counts as a regression.`
        );
      }
    }
  }

  if (overrideRatio !== undefined) {
    const r = Number(overrideRatio);
    if (!Number.isFinite(r) || r <= 0) {
      warnings.push(
        `MERGE_WEEKLY_PERF_RATIO="${overrideRatio}" is not a positive number — the perf test will ignore it and fall back to defaults.`
      );
    } else {
      if (r < 1.0) {
        warnings.push(
          `MERGE_WEEKLY_PERF_RATIO=${r}× is < 1.0 — this REQUIRES the optimized impl to be SLOWER than naive. Almost certainly a typo (intended ≥1.05×?).`
        );
      } else if (r < 1.05) {
        warnings.push(
          `MERGE_WEEKLY_PERF_RATIO=${r}× is below the CI floor (1.05×) — the perf test loses its ability to detect a real algorithmic regression.`
        );
      } else if (r > 5) {
        warnings.push(
          `MERGE_WEEKLY_PERF_RATIO=${r}× is unrealistically strict — even healthy runs only achieve 3-6× on the large bucket. Expect chronic flakiness.`
        );
      }
      const benchRatioSet = process.env.BENCH_MIN_RATIO !== undefined;
      if (benchRatioSet && Math.abs(r - MIN_RATIO) > 0.5) {
        warnings.push(
          `MERGE_WEEKLY_PERF_RATIO=${r}× diverges by >0.5 from BENCH_MIN_RATIO=${MIN_RATIO}× — the bench and the perf test will report different verdicts.`
        );
      }
    }
  }

  // Scale-mismatch hint: a perf override + a bench close to SMALL means
  // the bench will look fine but the LARGE bucket of the perf test won't.
  if (overrideBudget !== undefined && benchVsSmall < 5) {
    const factor = benchVsLarge < 1 ? `~${(1 / benchVsLarge).toFixed(0)}×` : "";
    warnings.push(
      `Bench scale (W×B=${benchScale}) is close to the SMALL perf bucket (W×B=${SMALL_WB}). MERGE_WEEKLY_PERF_BUDGET_MS applies to all 3 buckets — green here doesn't predict the LARGE bucket (W×B=${LARGE_WB}, ${factor} heavier).`
    );
  }

  if (warnings.length > 0) {
    console.warn("  ⚠ override coherence warnings:");
    for (const w of warnings) console.warn(`    • ${w}`);
    console.warn("");
  }

  const series = makeSeries(WEEKS, BROKERS, GAP_MOD);

  // Warm-up: stabilize JIT before timing.
  for (let i = 0; i < 3; i++) {
    mergeWeekly(series);
    mergeWeeklyNaive(series);
  }

  // Output-shape sanity check + sizing.
  const optimizedOut = mergeWeekly(series);
  const naiveOut = mergeWeeklyNaive(series);
  const rows = optimizedOut.length;
  const colsPerRow = rows > 0 ? Object.keys(optimizedOut[0]).length : 0;
  const optimizedBytes = approxBytes(optimizedOut);
  const naiveBytes = approxBytes(naiveOut);
  const shapeMatches =
    rows === naiveOut.length && optimizedBytes === naiveBytes;

  console.log("  output:");
  console.log(`    rows           : ${rows}`);
  console.log(`    cols/row       : ${colsPerRow}`);
  console.log(`    json bytes (opt): ${optimizedBytes.toLocaleString()}`);
  console.log(`    json bytes (nai): ${naiveBytes.toLocaleString()}`);
  console.log(
    `    shape match    : ${shapeMatches ? "✓ identical" : "✗ DIVERGED — investigate"}`
  );
  console.log("");

  const optSamples = bench("optimized", () => mergeWeekly(series), RUNS);
  const naiSamples = bench("naive", () => mergeWeeklyNaive(series), RUNS);

  const opt = summarize("optimized", optSamples);
  const nai = summarize("naive", naiSamples);

  console.log("  timing:");
  printTable([opt, nai]);

  // Use median for thresholds — matches the test suite, robust to outliers.
  const optMedian = opt.p50Ms;
  const naiMedian = nai.p50Ms;
  const ratio = nai.avgMs / opt.avgMs;
  const ratioMedian = naiMedian / optMedian;
  const requiredOptMaxMs = naiMedian / MIN_RATIO;

  // ─── Pass/fail evaluation ───────────────────────────────────────────────
  const failures: string[] = [];
  if (!shapeMatches) failures.push("output shape diverged from naive");
  if (optMedian >= BUDGET_MS) {
    failures.push(
      `optimized median ${optMedian.toFixed(3)}ms ≥ budget ${BUDGET_MS}ms`
    );
  }
  if (ratioMedian < MIN_RATIO) {
    failures.push(
      `median speedup ${ratioMedian.toFixed(2)}× < required ${MIN_RATIO.toFixed(2)}×`
    );
  }
  const failed = failures.length > 0;

  console.log("");
  console.log(`  speedup (avg)  : ${ratio.toFixed(2)}×  |  median: ${ratioMedian.toFixed(2)}×`);

  // VERBOSE controls whether the full diagnostic block is also printed when
  // the bench passes. The same block is always printed (to stderr) on failure.
  const VERBOSE = process.env.VERBOSE === "1" || process.env.VERBOSE === "true";

  // Shared report builder — identical content for pass+VERBOSE and failure
  // paths so a green VERBOSE run is directly comparable to a red CI log.
  const buildReport = (kind: "pass" | "fail"): string[] => {
    const lines: string[] = [""];
    if (kind === "fail") {
      lines.push(
        "  ╔══════════════════════════════════════════════════════════════╗",
        "  ║  ✗ REGRESSION DETECTED — mergeWeekly benchmark failed        ║",
        "  ╚══════════════════════════════════════════════════════════════╝",
        ""
      );
    } else {
      lines.push(
        "  ── verbose diagnostics (VERBOSE=1) ──",
        ""
      );
    }
    lines.push(
      "  measured:",
      `    optimized   median=${optMedian.toFixed(3)}ms  avg=${opt.avgMs.toFixed(3)}ms  p95=${opt.p95Ms.toFixed(3)}ms  min=${opt.minMs.toFixed(3)}ms  max=${opt.maxMs.toFixed(3)}ms`,
      `    naive       median=${naiMedian.toFixed(3)}ms  avg=${nai.avgMs.toFixed(3)}ms  p95=${nai.p95Ms.toFixed(3)}ms  min=${nai.minMs.toFixed(3)}ms  max=${nai.maxMs.toFixed(3)}ms`,
      `    speedup     median=${ratioMedian.toFixed(2)}×   avg=${ratio.toFixed(2)}×`,
      `    output      ${shapeMatches ? "shape OK" : "✗ DIVERGED — opt=" + optimizedBytes + "B vs nai=" + naiveBytes + "B"}`,
      "",
      "  thresholds (computed):",
      `    budget ceiling          : ${BUDGET_MS} ms/call  ${optMedian < BUDGET_MS ? "✓" : "✗"}  (override: BENCH_BUDGET_MS)`,
      `    required min speedup    : ${MIN_RATIO.toFixed(2)}×  → optimized median must be < ${requiredOptMaxMs.toFixed(3)} ms  ${optMedian < requiredOptMaxMs ? "✓" : "✗"}  (override: BENCH_MIN_RATIO)`,
      `    output shape parity     : required identical to naive  ${shapeMatches ? "✓" : "✗"}`,
      "",
      "  overrides:",
      "    BENCH_RUNS         iterations per impl (default 30)",
      "    BENCH_WEEKS        weeks per series (default 800)",
      "    BENCH_BROKERS      number of brokers (default 12)",
      "    BENCH_GAP_MOD      every Nth week is a gap per broker (default 10)",
      "    BENCH_BUDGET_MS    per-call median ceiling (default 75)",
      "    BENCH_MIN_RATIO    required naive/optimized speedup (default 1.2)",
      "    VERBOSE=1          always print this block, even when green",
      "",
      // Environment snapshot — exact values used for THIS run, marked as
      // (set) if explicitly provided via env or (default) if we fell back.
      // Lets you reproduce a CI-only flake locally with one copy-paste.
      "  environment snapshot (this run):",
      ...envRows,
      ""
    );
    if (kind === "fail") {
      lines.push(
        "  failures:",
        ...failures.map((f) => `    ✗ ${f}`),
        "",
        "  reproduce (using only env vars actually set in this shell):",
        `    ${reproduceCmd}`,
        ""
      );
    } else {
      lines.push(
        "  reproduce (using only env vars actually set in this shell):",
        `    ${reproduceCmd}`,
        ""
      );
    }
    return lines;
  };

  // ─── JSON artifact (for cross-run comparison) ───────────────────────────
  // Schema is intentionally flat-ish so it's diff-friendly. `samplesMs` keeps
  // the raw per-iteration numbers so a future tool can recompute medians,
  // percentiles, or trend deltas across many runs without re-running anything.
  if (jsonPath) {
    // Apply the slim mode AFTER all summary stats (median/p95/min/max) are
    // already computed from the FULL sample arrays. The slim only affects
    // what gets persisted — never what we report or use for verdicts.
    const optSlim = applySlim(optSamples, slimMode);
    const naiSlim = applySlim(naiSamples, slimMode);

    const artifact = {
      schemaVersion: 1,
      kind: "mergeWeekly-bench",
      status: failed ? "failed" : "ok",
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      durationMs: opt.totalMs + nai.totalMs,
      env: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: process.env.CI ?? null,
        // Git metadata: commit/branch/dirty so a regression in this artifact
        // can be traced back to a specific revision. Captured at run start
        // (above) so a long-running bench reflects the code that was timed,
        // not whatever HEAD points to when the JSON is written.
        git: gitInfo,
        // Snapshot every relevant knob — set or default — so future diffs
        // can flag config drift, not just timing drift.
        knobs: Object.fromEntries(
          trackedEnv.map((e) => [
            e.key,
            {
              value: e.effective,
              isSet:
                process.env[e.key] !== undefined && process.env[e.key] !== "",
            },
          ])
        ),
      },
      config: { runs: RUNS, weeks: WEEKS, brokers: BROKERS, gapMod: GAP_MOD },
      thresholds: {
        budgetMs: BUDGET_MS,
        minRatio: MIN_RATIO,
        requiredOptimizedMaxMs: requiredOptMaxMs,
      },
      output: {
        rows,
        colsPerRow,
        optimizedJsonBytes: optimizedBytes,
        naiveJsonBytes: naiveBytes,
        shapeMatches,
      },
      // Top-level slim descriptor so consumers (and the loader) can branch
      // on storage shape without inspecting every timings entry. Repeated
      // per-impl in `samplesMeta` for self-describing timing blocks.
      samplesPolicy: {
        mode: slimMode.kind,
        ...(slimMode.kind === "downsample" ? { n: slimMode.n } : {}),
      },
      timings: {
        optimized: {
          medianMs: opt.p50Ms,
          avgMs: opt.avgMs,
          p95Ms: opt.p95Ms,
          minMs: opt.minMs,
          maxMs: opt.maxMs,
          opsPerSec: opt.opsPerSec,
          samplesMs: optSlim.kept,
          samplesMeta: optSlim.meta,
        },
        naive: {
          medianMs: nai.p50Ms,
          avgMs: nai.avgMs,
          p95Ms: nai.p95Ms,
          minMs: nai.minMs,
          maxMs: nai.maxMs,
          opsPerSec: nai.opsPerSec,
          samplesMs: naiSlim.kept,
          samplesMeta: naiSlim.meta,
        },
        speedup: { median: ratioMedian, mean: ratio },
      },
      verdict: {
        passed: !failed,
        failures,
        reproduceCmd,
      },
    };

    writeArtifact(jsonPath, runStartedAt, artifact);
  }

  if (failed) {
    // Detailed regression report — stderr so CI logs and pre-push hooks
    // surface the exact numbers + thresholds prominently.
    for (const line of buildReport("fail")) console.error(line);
    process.exit(1);
  }

  if (VERBOSE) {
    for (const line of buildReport("pass")) console.log(line);
  }

  console.log(
    `  verdict        : ✓ healthy (median ${optMedian.toFixed(2)}ms < ${BUDGET_MS}ms budget, ${ratioMedian.toFixed(2)}× ≥ ${MIN_RATIO}× required)\n`
  );
}

// ─── Artifact writer + crash-path emitter ──────────────────────────────────
// Both helpers live at module scope so the top-level error handler can still
// emit a partial artifact when `main()` throws BEFORE reaching the normal
// JSON-write step. CI run diffs stay complete: every invocation that asked
// for `--json` produces a file, even on crash, with `status` reflecting why.
function resolveArtifactPath(jsonPath: string, startedAt: string): string {
  return jsonPath === "default"
    ? resolve(`bench-results/merge-weekly-${startedAt.replace(/[:.]/g, "-")}.json`)
    : resolve(jsonPath);
}

function writeArtifact(jsonPath: string, startedAt: string, artifact: unknown): string | null {
  const resolvedPath = resolveArtifactPath(jsonPath, startedAt);
  try {
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    console.log(`  json artifact  : ${resolvedPath}`);
    return resolvedPath;
  } catch (err) {
    console.error(
      `  ⚠ failed to write JSON artifact to ${resolvedPath}: ${(err as Error).message}`
    );
    return null;
  }
}

/**
 * Resolve `--json[=path]` and `BENCH_JSON` the same way `main()` does, but
 * standalone, so the crash handler can emit an artifact even if the throw
 * happened before `main()` finished its own CLI parsing.
 */
function resolveJsonPathFromEnv(): string | null {
  for (const arg of process.argv.slice(2)) {
    if (arg === "--json") return "default";
    if (arg.startsWith("--json=")) return arg.slice("--json=".length).trim() || "default";
  }
  if (process.env.BENCH_JSON) return process.env.BENCH_JSON.trim() || "default";
  return null;
}

// Pinned at process start so a successful run AND a crash artifact share the
// same `startedAt` (and therefore the same default filename — no orphan files).
const runStartedAt = new Date().toISOString();

main().catch((err) => {
  // Always surface the underlying error first.
  console.error(err);

  // Honour the user's `--json`/`BENCH_JSON` request even on crash so CI run
  // diffs are never missing a row. The artifact is intentionally minimal but
  // schema-compatible enough for the loader/validator to ingest it.
  const jsonPath = resolveJsonPathFromEnv();
  if (jsonPath) {
    const e = err as Error;
    const crashArtifact = {
      schemaVersion: 1,
      kind: "mergeWeekly-bench",
      status: "crashed",
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      env: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: process.env.CI ?? null,
        // Capture git metadata even on crash — the whole point is to trace a
        // bad revision, and a crash IS the regression we want to investigate.
        git: captureGitInfo(),
        // Knobs are captured raw here (we may not have parsed/validated them).
        knobs: Object.fromEntries(
          Object.entries(process.env)
            .filter(([k]) => k.startsWith("BENCH_") || k.startsWith("MERGE_WEEKLY_PERF_") || k === "CI" || k === "VERBOSE")
            .map(([k, v]) => [k, { value: v ?? "", isSet: true }])
        ),
      },
      verdict: {
        passed: false,
        failures: [`bench crashed before completion: ${e?.message ?? String(err)}`],
        reproduceCmd: "(see env above)",
      },
      error: {
        message: e?.message ?? String(err),
        name: e?.name ?? "Error",
        stack: e?.stack ?? null,
      },
    };
    writeArtifact(jsonPath, runStartedAt, crashArtifact);
  }

  process.exit(1);
});
