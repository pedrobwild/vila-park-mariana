import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const propertyName = typeof body.propertyName === "string" ? body.propertyName.slice(0, 200) : "";
    const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.slice(0, 100) : "";
    const city = typeof body.city === "string" ? body.city.slice(0, 100) : "";

    if (!neighborhood || !city) {
      return new Response(
        JSON.stringify({ success: false, error: "neighborhood and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "PERPLEXITY_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const query = `Dados atualizados do mercado imobiliário residencial no bairro ${neighborhood}, ${city}, Brasil.
Inclua:
1. Valor médio do m² de apartamentos residenciais no bairro ${neighborhood}
2. Valorização imobiliária do bairro ${neighborhood} nos últimos 12 meses
3. Perfil demográfico e de moradores do bairro ${neighborhood} (famílias, jovens profissionais, etc.)
4. Vantagens do bairro ${neighborhood} para morar (proximidade a metrô, parques, comércio, escolas, mobilidade)
5. Novos lançamentos residenciais e projetos de infraestrutura na região
6. Tendências do mercado imobiliário residencial em ${neighborhood} para 2025-2026

NÃO compare com outros bairros. Foque exclusivamente nos dados do bairro ${neighborhood}. Seja objetivo e use números quando possível.`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `Você é um analista de mercado imobiliário residencial especializado no bairro Vila Mariana e região, em São Paulo. Sempre responda em português do Brasil. Seja objetivo, use dados e números reais quando disponíveis. Formate a resposta em seções claras com títulos. O objetivo é fornecer dados que ajudem um comprador final a decidir pela compra de um apartamento no empreendimento residencial "${propertyName}", da incorporadora Matere Bittar, localizado no bairro ${neighborhood}, ${city}. NÃO compare com outros bairros — foque exclusivamente nos dados e vantagens do bairro ${neighborhood}.`,
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "month",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes no Perplexity." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    return new Response(
      JSON.stringify({ success: true, content, citations, model: data.model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("market-intel error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
