import { supabase } from "@/integrations/supabase/client";

export interface MarketIntelEvent {
  bairro: string;
  cidade: string;
  finalidade: string;
  /** Negócio de onde a análise foi disparada (rastreio ponta a ponta). */
  dealId?: string | null;
  /** Identificador único da tentativa, compartilhado entre início/fim e chamadas. */
  correlationId: string;
  /** true = usuário pediu "Atualizar análise"; false = primeira geração. */
  refresh: boolean;
  /** true = resposta veio do cache; false = regerada agora; null quando falhou. */
  cached: boolean | null;
  /** Tempo total da chamada, em milissegundos. */
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  /** ISO da geração retornada pela análise, quando houver. */
  generatedAt?: string;
}

/** Gera um identificador de correlação para uma tentativa de análise. */
export function newCorrelationId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `mi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Registra a tentativa de geração/atualização da análise de mercado em
 * `audit_logs`, com origem (cache vs recarregado), latência, negócio,
 * usuário e correlationId para rastreio ponta a ponta.
 * Fire-and-forget: nunca interrompe o fluxo da UI.
 */
export async function logMarketIntelEvent(event: MarketIntelEvent): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: event.refresh ? "market_intel_refresh" : "market_intel_generate",
      entity: "market_insights",
      entity_id: `${event.cidade}/${event.bairro}/${event.finalidade}`,
      metadata: {
        correlation_id: event.correlationId,
        deal_id: event.dealId ?? null,
        user_id: user.id,
        user_email: user.email ?? null,
        bairro: event.bairro,
        cidade: event.cidade,
        finalidade: event.finalidade,
        refresh: event.refresh,
        origem: event.cached === null ? "erro" : event.cached ? "cache" : "recarregado",
        cached: event.cached,
        latency_ms: Math.round(event.latencyMs),
        success: event.success,
        error: event.errorMessage ?? null,
        generated_at: event.generatedAt ?? null,
      },
    });
  } catch {
    // Log é best-effort; falhas aqui não afetam a análise exibida.
  }
}
