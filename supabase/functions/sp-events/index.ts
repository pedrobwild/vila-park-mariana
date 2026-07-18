import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_KEY = "sp_events_v2_jul2026_jul2027";
const CACHE_TTL_HOURS = 72; // events don't change often

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const PERPLEXITY_PROMPT = `Você é um analista de mercado imobiliário e de locação por temporada em São Paulo, especializado no bairro Vila Mariana.

Liste os PRINCIPAIS GRANDES EVENTOS e movimentos urbanos CONFIRMADOS OU PREVISTOS que acontecerão em São Paulo (capital) ESTRITAMENTE no intervalo entre 01/07/2026 e 31/07/2027 e que possam impactar a demanda por locação por temporada e o interesse por imóveis residenciais na região da Vila Mariana (próxima ao metrô Vila Mariana e ao empreendimento residencial Vila Park, da incorporadora Matere Bittar).

Considere: shows e turnês internacionais, festivais (Lollapalooza, The Town se houver edição no período, Primavera Sound), esportes (GP de Interlagos F1, maratona de SP, NBA House, jogos internacionais), grandes congressos e feiras (CCXP, São Paulo Fashion Week, Bienal, Web Summit Rio se atrair público a SP), eventos culturais relevantes, Carnaval 2027 e eventos recorrentes anuais que caiam dentro do intervalo.

Retorne um JSON válido (sem markdown, sem backticks) com esta estrutura:

{
  "events": [
    {
      "name": "Nome do evento",
      "category": "esporte|música|negócios|cultura|fórmula1|carnaval|tech|outros",
      "dateRange": "Mês/Ano específico dentro do intervalo 07/2026–07/2027 (ex: 'Novembro/2026' ou '15–17 Mar/2027')",
      "expectedAudience": "Número estimado de pessoas impactadas/participantes",
      "dailyRateImpact": "+XX%",
      "estimatedDailyRate": "faixa de diária estimada no período do evento",
      "normalDailyRate": "faixa de diária de referência sem o evento",
      "occupancyImpact": "XX% de aumento estimado na ocupação",
      "description": "Breve descrição do evento e por que impacta a demanda na Vila Mariana",
      "durationDays": 3,
      "recurring": true,
      "confidence": "alta|média|baixa"
    }
  ],
  "baselineDaily": "faixa de diária de referência do bairro sem eventos especiais",
  "annualHighlights": "Resumo de 2 frases sobre o calendário 07/2026–07/2027 e o potencial de receita/valorização na região",
  "topMonths": ["Mês 1", "Mês 2", "Mês 3"],
  "estimatedAnnualBoost": "+XX% de aumento estimado na receita anual com eventos vs período normal"
}

REGRAS OBRIGATÓRIAS:
- Retorne APENAS o JSON, sem texto antes ou depois
- SOMENTE eventos com data prevista entre 01/07/2026 e 31/07/2027. NÃO inclua eventos de 2025 nem posteriores a 31/07/2027.
- Todos os campos "dateRange" DEVEM conter mês e ano dentro desse intervalo.
- Mínimo 8, máximo 20 eventos
- Ordene cronologicamente (do mais próximo ao mais distante)
- Não invente eventos: se não houver confirmação, marque "confidence": "baixa" e use frase como "edição prevista" no dateRange.
- Escreva 100% em português do Brasil.`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const sb = getSupabaseAdmin();

    // Check cache
    if (!forceRefresh) {
      const { data: cached } = await sb
        .from("elephant_insights_cache")
        .select("*")
        .eq("cache_key", CACHE_KEY)
        .single();

      if (cached) {
        const ageHours =
          (Date.now() - new Date(cached.updated_at).getTime()) / 3600000;
        if (ageHours < CACHE_TTL_HOURS) {
          return new Response(
            JSON.stringify({
              success: true,
              cached: true,
              cacheAgeHours: Math.round(ageHours),
              events: cached.charts_data,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PERPLEXITY_API_KEY not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching SP events from Perplexity...");

    const ppxResponse = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista em mercado de hospedagem de curta duração em São Paulo. Responda sempre em JSON válido.",
            },
            { role: "user", content: PERPLEXITY_PROMPT },
          ],
          search_recency_filter: "month",
        }),
      }
    );

    if (!ppxResponse.ok) {
      const errText = await ppxResponse.text();
      console.error("Perplexity error:", ppxResponse.status, errText);
      throw new Error(`Perplexity ${ppxResponse.status}: ${errText}`);
    }

    const ppxData = await ppxResponse.json();
    let rawContent =
      ppxData.choices?.[0]?.message?.content || "";
    const citations = ppxData.citations || [];

    // Strip markdown fences
    rawContent = rawContent
      .replace(/^```json?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let eventsData;
    try {
      eventsData = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse events JSON:", rawContent.slice(0, 500));
      eventsData = null;
    }

    if (!eventsData) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao processar dados de eventos" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add citations
    eventsData.citations = citations;

    // Cache using existing table
    await sb.from("elephant_insights_cache").upsert(
      {
        cache_key: CACHE_KEY,
        insights: rawContent,
        charts_data: eventsData,
        total_meetings: eventsData.events?.length || 0,
        total_duration_minutes: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        events: eventsData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sp-events error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
