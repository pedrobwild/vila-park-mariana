import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_KEY = "sp_events_v1";
const CACHE_TTL_HOURS = 72; // events don't change often

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const PERPLEXITY_PROMPT = `Você é um analista de mercado imobiliário de short-stay (aluguel por temporada) em São Paulo.

Liste os PRINCIPAIS GRANDES EVENTOS que acontecerão em São Paulo nos próximos 2 anos (2025-2027) que geram alta demanda por hospedagem.

Para cada evento, estime o impacto na diária média de studios/apartamentos compactos na região da Consolação / Bela Vista / Paulista (região do empreendimento Urban Flex Bela Cintra).

Retorne um JSON válido (sem markdown, sem backticks) com esta estrutura:

{
  "events": [
    {
      "name": "Nome do evento",
      "category": "esporte|música|negócios|cultura|fórmula1|carnaval|tech|outros",
      "dateRange": "Mês/Ano ou período estimado",
      "expectedAudience": "Número estimado de visitantes/participantes",
      "dailyRateImpact": "+XX%",
      "estimatedDailyRate": "R$ XXX - R$ XXX",
      "normalDailyRate": "R$ XXX - R$ XXX",
      "occupancyImpact": "XX% de ocupação esperada",
      "description": "Breve descrição do evento e por que impacta a região",
      "durationDays": 3,
      "recurring": true,
      "confidence": "alta|média|baixa"
    }
  ],
  "baselineDaily": "R$ 200 - R$ 350",
  "annualHighlights": "Resumo de 2 frases sobre o calendário de eventos e o potencial de receita para proprietários",
  "topMonths": ["Mês 1", "Mês 2", "Mês 3"],
  "estimatedAnnualBoost": "+XX% de receita adicional estimada com eventos vs sem eventos"
}

REGRAS:
- Retorne APENAS o JSON, sem texto antes ou depois
- Mínimo 10 eventos, máximo 20
- Ordene por impacto na diária (maior primeiro)
- Inclua: F1, shows internacionais, eventos de tech (Web Summit Rio pode ter edição SP), CCXP, São Paulo Fashion Week, Lollapalooza, GP de Interlagos, maratonas, congressos médicos, eventos corporativos grandes, Carnaval
- A diária base na região da Consolação/Paulista para studios é R$ 200-350/noite em período normal
- Seja realista nos percentuais de aumento — eventos como F1 e shows grandes podem dobrar a diária
- Use dados reais de edições anteriores como referência
- Escreva em português do Brasil`;

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
