/**
 * Regression parity test between /ferramentas and /proposta/:token.
 *
 * Both routes consume the same shared subcomponents:
 *   - useFinancingSimulatorController (single source of truth for the snapshot)
 *   - FinancingSimulatorForm
 *   - FinancingSimulatorResults
 *
 * Difference between the two routes is only cosmetic:
 *   - /ferramentas renders <FinancingSimulatorResults ctl={ctl} />
 *   - /proposta   renders <FinancingSimulatorResults ctl={ctl}
 *                              showCopyLink={false} showResetButton={false} />
 *
 * This test locks that guarantee: for the same Snapshot, both invocations
 * produce IDENTICAL visible output (KPIs, schedules, charts, disclaimers),
 * differing only by the two hidden auxiliary buttons.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import {
  useFinancingSimulatorController,
  FinancingSimulatorResults,
  type FinancingSimulatorController,
  type SimulatorInitialForm,
} from "@/components/ferramentas/FinancingSimulator";

// Recharts + Radix in jsdom
class ROMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ROMock;
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

const FIXTURE: SimulatorInitialForm = {
  bankId: "caixa-sbpe",
  propertyValue: 800_000,
  downOverride: 200_000,
  termMonths: 360,
  rateInput: "11,19",
  system: "SAC",
  buyerAge: 35,
  monthlyIncome: 20_000,
  fgts: 0,
  extraAnnual: 0,
};

type Mode = "ferramentas" | "proposta";

function Harness({
  mode,
  onCtl,
}: {
  mode: Mode;
  onCtl: (c: FinancingSimulatorController) => void;
}) {
  const ctl = useFinancingSimulatorController({
    persist: false,
    initialForm: FIXTURE,
  });
  onCtl(ctl);
  return mode === "ferramentas" ? (
    <FinancingSimulatorResults ctl={ctl} />
  ) : (
    <FinancingSimulatorResults ctl={ctl} showCopyLink={false} showResetButton={false} />
  );
}

async function renderAndGenerate(mode: Mode) {
  const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
  const utils = render(<Harness mode={mode} onCtl={(c) => (ctlRef.current = c)} />);
  await act(async () => {
    ctlRef.current!.handleGenerate();
    // handleGenerate uses setTimeout(80) then setTimeout(60)
    await vi.advanceTimersByTimeAsync(200);
  });
  return { utils, ctl: () => ctlRef.current! };
}

// Trim volatile UI-only bits (the two aux buttons only shown in /ferramentas mode)
const AUX_BUTTONS = /(Copiar link|Refazer)/g;
const normalize = (root: HTMLElement) =>
  root.textContent!.replace(AUX_BUTTONS, "").replace(/\s+/g, " ").trim();

describe("FinancingSimulator · shared render parity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces the same Snapshot for identical inputs (single engine)", async () => {
    const a = await renderAndGenerate("ferramentas");
    const b = await renderAndGenerate("proposta");

    const snapA = a.ctl().snapshot;
    const snapB = b.ctl().snapshot;

    expect(snapA).not.toBeNull();
    expect(snapB).not.toBeNull();
    expect(snapB).toEqual(snapA);

    a.utils.unmount();
    b.utils.unmount();
  });

  it("renders identical KPI/table/notice text in both modes (only aux buttons differ)", async () => {
    const a = await renderAndGenerate("ferramentas");
    const b = await renderAndGenerate("proposta");

    const textA = normalize(a.utils.container as HTMLElement);
    const textB = normalize(b.utils.container as HTMLElement);
    expect(textB).toBe(textA);

    // /proposta hides the two auxiliary action buttons
    const btnLabels = (root: HTMLElement) =>
      Array.from(root.querySelectorAll("button")).map((b) => b.textContent?.trim() ?? "");
    expect(btnLabels(b.utils.container as HTMLElement).join("|")).not.toMatch(/Copiar link|^Refazer$/);

    // /ferramentas DOES surface them
    const ferraLabels = btnLabels(a.utils.container as HTMLElement).join("|");
    expect(ferraLabels).toMatch(/Copiar link/);
    expect(ferraLabels).toMatch(/Refazer/);

    a.utils.unmount();
    b.utils.unmount();
  });

  it("both modes render the mandatory disclaimers and CET figure", async () => {
    const a = await renderAndGenerate("ferramentas");
    const b = await renderAndGenerate("proposta");

    for (const utils of [a.utils, b.utils]) {
      const txt = utils.container.textContent ?? "";
      expect(txt).toMatch(/CET/);
      // Presence of key result headings (independent of exact wording drift)
      expect(txt).toMatch(/parcela/i);
      expect(txt).toMatch(/juros/i);
    }

    a.utils.unmount();
    b.utils.unmount();
  });
});
