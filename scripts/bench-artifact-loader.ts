/**
 * Schema-aware loader & validator for `mergeWeekly` benchmark JSON artifacts.
 *
 * Why this exists:
 *   `bench-merge-weekly.ts` writes JSON files tagged with `schemaVersion`. As
 *   the bench evolves, fields will be renamed, added, removed, or restructured.
 *   Existing artifacts on disk (or stored as CI build attachments) must remain
 *   loadable so we can still compare today's run against last month's.
 *
 *   This module is the ONLY place that knows about the historical shape of
 *   each schemaVersion. Every consumer (diff tools, dashboards, ad-hoc
 *   scripts) loads artifacts through `loadArtifact()` and gets back the
 *   CURRENT canonical shape, regardless of how old the file is.
 *
 * Usage as a library:
 *   import { loadArtifact, loadArtifacts, CURRENT_SCHEMA_VERSION } from "./bench-artifact-loader";
 *   const a = loadArtifact("bench-results/old.json");   // auto-migrated
 *   const all = loadArtifacts("bench-results/*.json");  // sorted by startedAt
 *
 * Usage as a CLI:
 *   npx tsx scripts/bench-artifact-loader.ts validate <path>
 *   npx tsx scripts/bench-artifact-loader.ts validate <dir>
 *   npx tsx scripts/bench-artifact-loader.ts inspect  <path>     # human summary
 *   npx tsx scripts/bench-artifact-loader.ts migrate  <path> [--write]
 *       # prints (or writes back) the artifact upgraded to the latest schema
 *   npx tsx scripts/bench-artifact-loader.ts diff <baseline> <candidate>
 *       # compares two artifacts after migrating both to the current schema
 *
 * Design rules for adding a new schemaVersion:
 *   1. Bump `CURRENT_SCHEMA_VERSION`.
 *   2. Add a `migrators[N] = (prev) => next` entry that upgrades v(N-1) → vN.
 *   3. NEVER mutate the input — always return a new object. Migrators must be
 *      pure so re-running them is safe.
 *   4. Update the `CanonicalArtifact` type to reflect the latest shape.
 *   5. Add a regression note in this header explaining what changed and why.
 *
 * Schema history:
 *   v1  — initial format emitted by bench-merge-weekly.ts. Fields:
 *         schemaVersion, kind, startedAt, durationMs, env{node,platform,arch,
 *         ci,knobs}, config{runs,weeks,brokers,gapMod}, thresholds{budgetMs,
 *         minRatio,requiredOptimizedMaxMs}, output{rows,colsPerRow,
 *         optimizedJsonBytes,naiveJsonBytes,shapeMatches},
 *         timings{optimized,naive,speedup}, verdict{passed,failures,
 *         reproduceCmd}.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, resolve } from "node:path";

// ─── Current canonical shape ────────────────────────────────────────────────
// Bump this whenever the bench output evolves AND add a migrator below.
export const CURRENT_SCHEMA_VERSION = 1 as const;
export const ARTIFACT_KIND = "mergeWeekly-bench" as const;

export interface CanonicalKnob {
  value: string;
  isSet: boolean;
}

export interface CanonicalSamplesMeta {
  /** How `samplesMs` was stored: full = every sample, omit = none, downsample/summary = compressed view. */
  kind: "full" | "omit" | "downsample" | "summary";
  /** Number of samples actually collected during the run (pre-slim). */
  originalLength: number;
  /** Number of entries kept in `samplesMs` (`kept === samplesMs.length`). */
  kept: number;
}

export interface CanonicalTiming {
  medianMs: number;
  avgMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  opsPerSec: number;
  samplesMs: number[];
  /**
   * Present on artifacts written with `--json-slim`. Absent ⇒ legacy/full
   * artifact where `samplesMs.length === config.runs`. When present, the
   * length invariant is relaxed and `originalLength` is the source of truth
   * for "how many iterations actually ran".
   */
  samplesMeta?: CanonicalSamplesMeta;
}

export interface CanonicalArtifact {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  kind: typeof ARTIFACT_KIND;
  /** "ok" | "failed" (thresholds breached) | "crashed" (uncaught throw before completion). Optional for legacy artifacts written before this field existed. */
  status?: "ok" | "failed" | "crashed";
  startedAt: string;
  /** ISO timestamp written when the run finishes (or crashes). Optional for legacy artifacts. */
  finishedAt?: string;
  /** Wall-clock ms in the timed loops. Absent on crash artifacts (timing never ran). */
  durationMs?: number;
  env: {
    node: string;
    platform: string;
    arch: string;
    ci: string | null;
    /**
     * Git metadata captured at run start. Optional because legacy artifacts
     * (pre-git-tracking) and tarball builds without a `.git` directory will
     * not have it. Inner fields are individually nullable so consumers can
     * degrade gracefully (e.g. show "(unknown)" instead of crashing).
     */
    git?: {
      commit: string | null;
      shortSha: string | null;
      branch: string | null;
      dirty: boolean | null;
      source: "env" | "git" | "mixed" | "none";
    };
    knobs: Record<string, CanonicalKnob>;
  };
  /** Absent on crash artifacts written before config parsing completed. */
  config?: { runs: number; weeks: number; brokers: number; gapMod: number };
  thresholds?: {
    budgetMs: number;
    minRatio: number;
    requiredOptimizedMaxMs: number;
  };
  output?: {
    rows: number;
    colsPerRow: number;
    optimizedJsonBytes: number;
    naiveJsonBytes: number;
    shapeMatches: boolean;
  };
  /**
   * Top-level descriptor of how `samplesMs` was stored. Present when
   * `--json-slim` was used. Repeated per-impl in `timings.*.samplesMeta` for
   * self-describing timing blocks; this top-level copy is for quick scans
   * (e.g. listing CI artifacts and grouping by storage policy).
   */
  samplesPolicy?: {
    mode: "full" | "omit" | "downsample" | "summary";
    n?: number; // only set when mode === "downsample"
  };
  timings?: {
    optimized: CanonicalTiming;
    naive: CanonicalTiming;
    speedup: { median: number; mean: number };
  };
  verdict: { passed: boolean; failures: string[]; reproduceCmd: string };
  /** Present only on crash artifacts. */
  error?: { message: string; name: string; stack: string | null };
  /** Audit trail — populated by `loadArtifact` when migrations were applied. */
  _migrations?: Array<{ from: number; to: number }>;
}

// ─── Migrator chain ─────────────────────────────────────────────────────────
// migrators[N] upgrades a v(N-1) artifact in-place to v(N) shape. Index 0
// and 1 are no-ops because v1 is the initial schema. When v2 ships, add
// migrators[2] = (v1) => v2object.
type Migrator = (prev: any) => any;

const migrators: Record<number, Migrator> = {
  // 1: identity — initial schema, nothing to migrate from.
  1: (a) => a,
  // 2: (example for the next bump) — uncomment & adapt when bumping.
  // 2: (v1) => ({
  //   ...v1,
  //   schemaVersion: 2,
  //   // e.g. rename `output.shapeMatches` → `output.shapeIsIdentical`
  //   output: { ...v1.output, shapeIsIdentical: v1.output.shapeMatches },
  // }),
};

// ─── Validation ─────────────────────────────────────────────────────────────
export interface ValidationIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/**
 * Light structural validation of a RAW artifact (pre-migration). We only
 * enforce the fields necessary to safely run the migrator chain — anything
 * deeper is checked by `validateCanonical()` after migration.
 */
export function validateRaw(raw: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (raw === null || typeof raw !== "object") {
    issues.push({ severity: "error", path: "$", message: "artifact must be a JSON object" });
    return issues;
  }
  const a = raw as Record<string, unknown>;
  if (!isFiniteNumber(a.schemaVersion) || (a.schemaVersion as number) < 1) {
    issues.push({
      severity: "error",
      path: "$.schemaVersion",
      message: `missing or invalid schemaVersion (got ${JSON.stringify(a.schemaVersion)})`,
    });
  }
  if (a.kind !== undefined && a.kind !== ARTIFACT_KIND) {
    issues.push({
      severity: "warning",
      path: "$.kind",
      message: `unexpected kind=${JSON.stringify(a.kind)} (expected "${ARTIFACT_KIND}")`,
    });
  }
  if ((a.schemaVersion as number) > CURRENT_SCHEMA_VERSION) {
    issues.push({
      severity: "error",
      path: "$.schemaVersion",
      message: `artifact schemaVersion=${a.schemaVersion} is newer than this loader (max=${CURRENT_SCHEMA_VERSION}). Update the loader.`,
    });
  }
  return issues;
}

/**
 * Strict validation of an already-migrated CANONICAL artifact. Run after
 * `migrate()` so consumers can trust the shape downstream.
 */
export function validateCanonical(a: CanonicalArtifact): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const req = (cond: boolean, path: string, msg: string) => {
    if (!cond) issues.push({ severity: "error", path, message: msg });
  };
  const warn = (cond: boolean, path: string, msg: string) => {
    if (!cond) issues.push({ severity: "warning", path, message: msg });
  };

  req(a.schemaVersion === CURRENT_SCHEMA_VERSION, "$.schemaVersion", `expected ${CURRENT_SCHEMA_VERSION}`);
  req(a.kind === ARTIFACT_KIND, "$.kind", `expected "${ARTIFACT_KIND}"`);
  req(isString(a.startedAt) && !Number.isNaN(Date.parse(a.startedAt)), "$.startedAt", "must be ISO-8601 string");

  // env (always required — captured before any user code runs)
  req(a.env != null && typeof a.env === "object", "$.env", "missing");
  if (a.env) {
    req(isString(a.env.node), "$.env.node", "must be string");
    req(isString(a.env.platform), "$.env.platform", "must be string");
    req(isString(a.env.arch), "$.env.arch", "must be string");
    req(a.env.knobs != null && typeof a.env.knobs === "object", "$.env.knobs", "must be object");
  }

  // verdict (always required — even crash artifacts emit one)
  req(typeof a.verdict?.passed === "boolean", "$.verdict.passed", "must be boolean");
  req(Array.isArray(a.verdict?.failures), "$.verdict.failures", "must be array");
  req(isString(a.verdict?.reproduceCmd), "$.verdict.reproduceCmd", "must be string");

  // Crash artifacts intentionally OMIT timing/config/thresholds blocks because
  // the bench threw before producing them. Validate only what is present so
  // CI run diffs can still ingest these failure-mode artifacts.
  if (a.status === "crashed") {
    req(
      a.error != null && isString(a.error.message),
      "$.error.message",
      "crash artifact must include error.message"
    );
    return issues;
  }

  // Completed runs ("ok" or "failed", or legacy artifacts without status):
  // require the full shape.
  req(isFiniteNumber(a.durationMs) && (a.durationMs ?? -1) >= 0, "$.durationMs", "must be ≥ 0");

  // config
  for (const k of ["runs", "weeks", "brokers", "gapMod"] as const) {
    req(isFiniteNumber(a.config?.[k]) && (a.config?.[k] ?? 0) > 0, `$.config.${k}`, "must be > 0");
  }

  // thresholds
  req(isFiniteNumber(a.thresholds?.budgetMs) && (a.thresholds?.budgetMs ?? 0) > 0, "$.thresholds.budgetMs", "must be > 0");
  req(isFiniteNumber(a.thresholds?.minRatio) && (a.thresholds?.minRatio ?? 0) > 0, "$.thresholds.minRatio", "must be > 0");
  warn(
    (a.thresholds?.minRatio ?? 0) >= 1.0,
    "$.thresholds.minRatio",
    "< 1.0× requires optimized to be slower than naive — likely a typo"
  );

  // timings
  for (const impl of ["optimized", "naive"] as const) {
    const t = a.timings?.[impl];
    req(t != null, `$.timings.${impl}`, "missing");
    if (t) {
      for (const k of ["medianMs", "avgMs", "p95Ms", "minMs", "maxMs", "opsPerSec"] as const) {
        req(isFiniteNumber(t[k]) && t[k] >= 0, `$.timings.${impl}.${k}`, "must be ≥ 0 finite number");
      }
      req(Array.isArray(t.samplesMs), `$.timings.${impl}.samplesMs`, "must be array");
      // `samplesMeta` (added with --json-slim) tells us this artifact was
      // intentionally compressed. When present, the strict
      // `samplesMs.length === config.runs` invariant is replaced by:
      //   1. samplesMs.length === samplesMeta.kept
      //   2. samplesMeta.originalLength === config.runs (if config present)
      // so we still catch corruption without false-failing slim artifacts.
      const meta = (t as { samplesMeta?: CanonicalSamplesMeta }).samplesMeta;
      if (Array.isArray(t.samplesMs)) {
        if (meta) {
          req(t.samplesMs.length === meta.kept, `$.timings.${impl}.samplesMs.length`, `expected ${meta.kept} (slim:${meta.kind})`);
          if (a.config) {
            req(meta.originalLength === a.config.runs, `$.timings.${impl}.samplesMeta.originalLength`, `expected ${a.config.runs}`);
          }
        } else if (a.config) {
          req(t.samplesMs.length === a.config.runs, `$.timings.${impl}.samplesMs.length`, `expected ${a.config.runs}`);
        }
        req(t.samplesMs.every(isFiniteNumber), `$.timings.${impl}.samplesMs[]`, "all entries must be finite numbers");
      }
      req(t.minMs <= t.medianMs && t.medianMs <= t.maxMs, `$.timings.${impl}`, "min ≤ median ≤ max invariant violated");
    }
  }

  return issues;
}

// ─── Migration ──────────────────────────────────────────────────────────────
/**
 * Walk an artifact from its `schemaVersion` up to `CURRENT_SCHEMA_VERSION` by
 * applying each migrator in sequence. Returns `{ artifact, applied }` so the
 * caller can audit which migrations ran.
 */
export function migrate(raw: any): { artifact: CanonicalArtifact; applied: Array<{ from: number; to: number }> } {
  const fromVersion = Number(raw.schemaVersion);
  if (!Number.isFinite(fromVersion) || fromVersion < 1) {
    throw new Error(`Cannot migrate: invalid schemaVersion=${raw.schemaVersion}`);
  }
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Cannot migrate DOWN from v${fromVersion} to v${CURRENT_SCHEMA_VERSION}. Update the loader.`
    );
  }
  let cur: any = raw;
  const applied: Array<{ from: number; to: number }> = [];
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const m = migrators[v];
    if (!m) {
      throw new Error(`No migrator registered for v${v - 1} → v${v}. Add one to migrators[${v}].`);
    }
    cur = m(cur);
    if (cur?.schemaVersion !== v) {
      throw new Error(`Migrator for v${v} did not set schemaVersion to ${v} (got ${cur?.schemaVersion})`);
    }
    applied.push({ from: v - 1, to: v });
  }
  return { artifact: cur as CanonicalArtifact, applied };
}

// ─── High-level loaders ─────────────────────────────────────────────────────
export interface LoadResult {
  path: string;
  artifact: CanonicalArtifact;
  rawSchemaVersion: number;
  migrationsApplied: Array<{ from: number; to: number }>;
  issues: ValidationIssue[];
}

/**
 * Load a single artifact from disk: parse → validate raw → migrate → validate
 * canonical. Throws on errors that prevent migration; collects non-fatal
 * issues in `issues`.
 */
export function loadArtifact(filePath: string): LoadResult {
  const abs = resolve(filePath);
  if (!existsSync(abs)) throw new Error(`Artifact not found: ${abs}`);
  const text = readFileSync(abs, "utf8");
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON in ${abs}: ${(err as Error).message}`);
  }
  const rawIssues = validateRaw(raw);
  const fatalRaw = rawIssues.filter((i) => i.severity === "error");
  if (fatalRaw.length > 0) {
    throw new Error(
      `Artifact ${abs} failed pre-migration validation:\n  ${fatalRaw.map((i) => `${i.path}: ${i.message}`).join("\n  ")}`
    );
  }
  const { artifact, applied } = migrate(raw);
  const canonicalIssues = validateCanonical(artifact);
  if (applied.length > 0) artifact._migrations = applied;
  return {
    path: abs,
    artifact,
    rawSchemaVersion: Number(raw.schemaVersion),
    migrationsApplied: applied,
    issues: [...rawIssues, ...canonicalIssues],
  };
}

/**
 * Load every `*.json` artifact in `pathOrDir` (file OR directory). Sorted by
 * `startedAt` ascending so trend tools get a chronological series for free.
 */
export function loadArtifacts(pathOrDir: string): LoadResult[] {
  const abs = resolve(pathOrDir);
  if (!existsSync(abs)) throw new Error(`Path not found: ${abs}`);
  const files = statSync(abs).isDirectory()
    ? readdirSync(abs)
        .filter((f) => extname(f).toLowerCase() === ".json")
        .map((f) => join(abs, f))
    : [abs];
  const results = files.map((f) => loadArtifact(f));
  return results.sort((a, b) => a.artifact.startedAt.localeCompare(b.artifact.startedAt));
}

// ─── Diff (canonical-vs-canonical) ──────────────────────────────────────────
/**
 * Compare two artifacts. Both are migrated to the current schema first, so
 * a v1 baseline can be compared to a v2 candidate without hand-mapping fields.
 */
export function diffArtifacts(baseline: CanonicalArtifact, candidate: CanonicalArtifact) {
  const baseMed = baseline.timings.optimized.medianMs;
  const candMed = candidate.timings.optimized.medianMs;
  const baseRatio = baseline.timings.speedup.median;
  const candRatio = candidate.timings.speedup.median;
  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);
  return {
    optimizedMedianMs: { baseline: baseMed, candidate: candMed, deltaPct: pct(candMed, baseMed) },
    speedupMedian: { baseline: baseRatio, candidate: candRatio, deltaAbs: candRatio - baseRatio },
    rows: { baseline: baseline.output.rows, candidate: candidate.output.rows },
    shapeMatches: { baseline: baseline.output.shapeMatches, candidate: candidate.output.shapeMatches },
    config: {
      sameScale:
        baseline.config.weeks === candidate.config.weeks &&
        baseline.config.brokers === candidate.config.brokers,
    },
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────────
function fmtIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return "    (no issues)";
  return issues
    .map((i) => `    ${i.severity === "error" ? "✗" : "⚠"} ${i.path} — ${i.message}`)
    .join("\n");
}

function cliValidate(target: string): number {
  const results = loadArtifacts(target);
  let errors = 0;
  for (const r of results) {
    const errCount = r.issues.filter((i) => i.severity === "error").length;
    const warnCount = r.issues.filter((i) => i.severity === "warning").length;
    const tag = errCount === 0 ? (warnCount === 0 ? "✓ ok" : `⚠ ${warnCount} warning(s)`) : `✗ ${errCount} error(s)`;
    const mig =
      r.migrationsApplied.length > 0
        ? ` [migrated v${r.rawSchemaVersion}→v${CURRENT_SCHEMA_VERSION}]`
        : "";
    console.log(`${tag}${mig}  ${r.path}`);
    if (r.issues.length > 0) console.log(fmtIssues(r.issues));
    errors += errCount;
  }
  console.log(`\n  ${results.length} artifact(s) checked, ${errors} error(s).`);
  return errors === 0 ? 0 : 1;
}

function cliInspect(target: string): number {
  const r = loadArtifact(target);
  const a = r.artifact;
  console.log(`\n▶ ${r.path}`);
  console.log(`  schema       : v${r.rawSchemaVersion}${r.migrationsApplied.length > 0 ? ` → v${CURRENT_SCHEMA_VERSION} (migrated)` : ""}`);
  console.log(`  startedAt    : ${a.startedAt}`);
  console.log(`  node/platform: ${a.env.node}  ${a.env.platform}/${a.env.arch}  CI=${a.env.ci ?? "(unset)"}`);
  if (a.env.git) {
    const g = a.env.git;
    console.log(
      `  git          : ${g.shortSha ?? "(unknown)"}${g.dirty ? "-dirty" : ""}  branch=${g.branch ?? "(detached)"}  source=${g.source}`
    );
  }
  console.log(`  config       : weeks=${a.config.weeks} brokers=${a.config.brokers} gapMod=${a.config.gapMod} runs=${a.config.runs}`);
  console.log(`  thresholds   : budget=${a.thresholds.budgetMs}ms minRatio=${a.thresholds.minRatio}×`);
  if (a.samplesPolicy && a.samplesPolicy.mode !== "full") {
    const m = a.timings?.optimized.samplesMeta;
    const policy =
      a.samplesPolicy.mode === "downsample"
        ? `downsample:${a.samplesPolicy.n}`
        : a.samplesPolicy.mode;
    console.log(
      `  samples      : ${policy}  (kept ${m?.kept ?? "?"} of ${m?.originalLength ?? "?"} per impl)`
    );
  }
  console.log(`  optimized    : median=${a.timings.optimized.medianMs.toFixed(3)}ms p95=${a.timings.optimized.p95Ms.toFixed(3)}ms`);
  console.log(`  naive        : median=${a.timings.naive.medianMs.toFixed(3)}ms p95=${a.timings.naive.p95Ms.toFixed(3)}ms`);
  console.log(`  speedup      : median=${a.timings.speedup.median.toFixed(2)}× mean=${a.timings.speedup.mean.toFixed(2)}×`);
  console.log(`  verdict      : ${a.verdict.passed ? "✓ passed" : "✗ FAILED — " + a.verdict.failures.join("; ")}`);
  if (r.issues.length > 0) {
    console.log(`  issues       :\n${fmtIssues(r.issues)}`);
  }
  return 0;
}

function cliMigrate(target: string, write: boolean): number {
  const r = loadArtifact(target);
  if (r.migrationsApplied.length === 0) {
    console.log(`  ✓ already at v${CURRENT_SCHEMA_VERSION} — no migration needed: ${r.path}`);
    return 0;
  }
  const out = JSON.stringify(r.artifact, null, 2) + "\n";
  if (write) {
    writeFileSync(r.path, out, "utf8");
    console.log(`  ✓ migrated v${r.rawSchemaVersion} → v${CURRENT_SCHEMA_VERSION} and overwrote ${r.path}`);
  } else {
    process.stdout.write(out);
  }
  return 0;
}

function cliDiff(baselinePath: string, candidatePath: string): number {
  const base = loadArtifact(baselinePath);
  const cand = loadArtifact(candidatePath);
  const d = diffArtifacts(base.artifact, cand.artifact);
  console.log(`\n▶ diff`);
  console.log(`  baseline : ${base.path} (v${base.rawSchemaVersion})`);
  console.log(`  candidate: ${cand.path} (v${cand.rawSchemaVersion})`);
  if (!d.config.sameScale) {
    console.warn(
      `  ⚠ scale differs — baseline weeks×brokers=${base.artifact.config.weeks}×${base.artifact.config.brokers}, candidate=${cand.artifact.config.weeks}×${cand.artifact.config.brokers}. Timings are NOT directly comparable.`
    );
  }
  console.log(
    `  optimized median: ${d.optimizedMedianMs.baseline.toFixed(3)}ms → ${d.optimizedMedianMs.candidate.toFixed(3)}ms  (${d.optimizedMedianMs.deltaPct >= 0 ? "+" : ""}${d.optimizedMedianMs.deltaPct.toFixed(1)}%)`
  );
  console.log(
    `  speedup median  : ${d.speedupMedian.baseline.toFixed(2)}× → ${d.speedupMedian.candidate.toFixed(2)}×  (${d.speedupMedian.deltaAbs >= 0 ? "+" : ""}${d.speedupMedian.deltaAbs.toFixed(2)}×)`
  );
  console.log(`  rows            : ${d.rows.baseline} → ${d.rows.candidate}`);
  console.log(`  shape match     : ${d.shapeMatches.baseline} → ${d.shapeMatches.candidate}`);
  return 0;
}

function cliHelp() {
  console.log(`Usage: tsx scripts/bench-artifact-loader.ts <command> [args]

Commands:
  validate <path>             Validate one file or every *.json in a directory
  inspect  <path>             Print a human-readable summary of one artifact
  migrate  <path> [--write]   Print (or write back) a v→latest migrated artifact
  diff <baseline> <candidate> Compare two artifacts (auto-migrated)

Loader API (importable):
  loadArtifact(path) → { artifact, rawSchemaVersion, migrationsApplied, issues }
  loadArtifacts(dir) → LoadResult[] sorted by startedAt
  CURRENT_SCHEMA_VERSION = ${CURRENT_SCHEMA_VERSION}
`);
}

// Detect direct execution (works under tsx/node ESM and CJS).
const invokedDirectly = (() => {
  try {
    // ESM: import.meta.url matches process.argv[1]
    // We avoid top-level import.meta to keep this file dual-mode friendly.
    const argv1 = process.argv[1] ?? "";
    return argv1.endsWith("bench-artifact-loader.ts") || argv1.endsWith("bench-artifact-loader.js");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  const [, , cmd, ...rest] = process.argv;
  try {
    let exitCode = 0;
    switch (cmd) {
      case "validate":
        if (!rest[0]) throw new Error("validate requires a path");
        exitCode = cliValidate(rest[0]);
        break;
      case "inspect":
        if (!rest[0]) throw new Error("inspect requires a path");
        exitCode = cliInspect(rest[0]);
        break;
      case "migrate":
        if (!rest[0]) throw new Error("migrate requires a path");
        exitCode = cliMigrate(rest[0], rest.includes("--write"));
        break;
      case "diff":
        if (!rest[0] || !rest[1]) throw new Error("diff requires <baseline> <candidate>");
        exitCode = cliDiff(rest[0], rest[1]);
        break;
      case "-h":
      case "--help":
      case undefined:
        cliHelp();
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        cliHelp();
        exitCode = 2;
    }
    process.exit(exitCode);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }
}
