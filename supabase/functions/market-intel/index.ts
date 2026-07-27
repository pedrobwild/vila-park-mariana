import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ─── Rate limit simples em memória ──────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const PURPOSE_TEXT: Record<string, string> = {
  short_stay:
    "O comprador pretende operar o imóvel em locação de curta temporada (short stay / Airbnb).",
  long_stay:
    "O comprador pretende alugar o imóvel por longa duração (long stay, contrato residencial).",
  moradia: "O comprador pretende usar o imóvel para moradia própria.",
  geral: "O comprador ainda não definiu a finalidade do imóvel.",
};

const SECTIONS = [
  { id: "valor_m2", titulo: "Valor do m²" },
  { id: "valorizacao_12m", titulo: "Valorização nos últimos 12 meses" },
  { id: "perfil_morador", titulo: "Perfil do morador" },
  { id: "vantagens", titulo: "Vantagens para morar" },
  { id: "lancamentos", titulo: "Novos lançamentos recentes" },
  { id: "tendencias", titulo: "Tendências" },
  { id: "leitura_pratica", titulo: "Leitura prática para comprador e investidor" },
];

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const propertyName =
      typeof body.propertyName === "string" ? body.propertyName.slice(0, 200) : "";
    const neighborhood =
      typeof body.neighborhood === "string" && body.neighborhood.trim()
        ? body.neighborhood.trim().slice(0, 100)
        : typeof body.bairro === "string"
          ? body.bairro.trim().slice(0, 100)
          : "";
    const city =
      typeof body.city === "string" && body.city.trim()
        ? body.city.trim().slice(0, 100)
        : typeof body.cidade === "string"
          ? body.cidade.trim().slice(0, 100)
          : "";
    const finalidade =
      typeof body.finalidade === "string" && PURPOSE_TEXT[body.finalidade]
        ? body.finalidade
        : "geral";
    // structured=true → resposta em JSON por seção + cache no banco (uso no CRM)
    const structured = body.structured === true;
    const refresh = body.refresh === true;

    if (!neighborhood || !city) {
      return new Response(
        JSON.stringify({ success: false, error: "neighborhood and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ip = req.headers.get("x-forwarded-for") ?? "anon";
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Muitas requisições em sequência. Aguarde um minuto e tente de novo.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = structured ? getSupabaseAdmin() : null;

    // ─── Cache ────────────────────────────────────────────────
    if (structured && admin && !refresh) {
      const { data: cached } = await admin
        .from("market_insights")
        .select("payload, sources, model, generated_at")
        .eq("bairro", neighborhood)
        .eq("cidade", city)
        .eq("finalidade", finalidade)
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.generated_at).getTime() < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            payload: cached.payload,
            sources: cached.sources,
            model: cached.model,
            generated_at: cached.generated_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "PERPLEXITY_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const commonRules = `REGRAS OBRIGATÓRIAS:
- Responda 100% em português do Brasil. Não misture palavras em inglês.
- Foque exclusivamente em ${neighborhood} e no seu entorno imediato. Não compare com outros bairros.
- Só cite POIs (hospitais, escolas, empreendimentos, ruas, praças) verificáveis e realmente localizados em ${neighborhood} ou adjacências. Em caso de dúvida, use termos genéricos: "hospitais da região", "escolas próximas".
- Nunca invente nomes de hospitais, ruas, condomínios, incorporadoras ou pessoas. Se não souber, omita.
- Use números apenas quando puder verificá-los em fontes públicas.`;

    const systemBase = `Você é um analista de mercado imobiliário residencial especializado em ${neighborhood}, ${city}. RESPONDA SEMPRE E APENAS EM PORTUGUÊS DO BRASIL. ${
      propertyName ? `A análise apoia a avaliação do empreendimento "${propertyName}". ` : ""
    }${PURPOSE_TEXT[finalidade]} NÃO compare com outros bairros e NÃO invente POIs, ruas, condomínios, incorporadoras ou pessoas.`;

    const userPrompt = structured
      ? `Produza uma análise do mercado imobiliário residencial de ${neighborhood}, ${city}, Brasil.

Responda APENAS com um objeto JSON válido, sem texto fora do JSON, no formato:
{"secoes":[{"id":"<id>","titulo":"<título>","texto":"<2 a 4 frases>","refs":[1,2]}],"fontes":[{"n":1,"titulo":"<nome da fonte>","url":"<url ou vazio>"}]}

Use exatamente estes ids/títulos de seção, nesta ordem:
${SECTIONS.map((s) => `- ${s.id}: ${s.titulo}`).join("\n")}

Na seção leitura_pratica, escreva uma leitura objetiva para comprador e para investidor considerando que: ${PURPOSE_TEXT[finalidade]}
Numere as fontes a partir de 1 e referencie-as em "refs".

${commonRules}`
      : `Dados atualizados do mercado imobiliário residencial no bairro ${neighborhood}, ${city}, Brasil.
Inclua: valor médio do m², valorização nos últimos 12 meses, perfil do morador, vantagens para morar, novos lançamentos recentes e tendências para os próximos anos.

${commonRules}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemBase },
          { role: "user", content: userPrompt },
        ],
        search_recency_filter: "month",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Limite de requisições atingido. Tente novamente em alguns segundos.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes no provedor de IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    if (!structured) {
      // Compatibilidade com o consumo público existente (MarketIntelSection)
      return new Response(
        JSON.stringify({ success: true, content, citations, model: data.model }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = extractJson(content) as
      | { secoes?: unknown[]; fontes?: unknown[] }
      | null;

    const secoes = Array.isArray(parsed?.secoes)
      ? (parsed!.secoes as Record<string, unknown>[])
          .filter((s) => typeof s?.texto === "string" && (s.texto as string).trim())
          .map((s) => ({
            id: String(s.id ?? ""),
            titulo:
              String(s.titulo ?? "") ||
              SECTIONS.find((x) => x.id === s.id)?.titulo ||
              "Análise",
            texto: String(s.texto),
            refs: Array.isArray(s.refs) ? (s.refs as unknown[]).map((r) => Number(r)) : [],
          }))
      : [];

    if (secoes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A IA não retornou a análise no formato esperado. Tente atualizar novamente.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fontesModelo = Array.isArray(parsed?.fontes)
      ? (parsed!.fontes as Record<string, unknown>[]).map((f, i) => ({
          n: Number(f.n ?? i + 1),
          titulo: String(f.titulo ?? "").slice(0, 200),
          url: typeof f.url === "string" ? f.url : "",
        }))
      : [];

    const sources = fontesModelo.map((f) => {
      let url = f.url;
      if (!url && citations[f.n - 1]) url = citations[f.n - 1];
      let titulo = f.titulo;
      if (!titulo && url) {
        try {
          titulo = new URL(url).hostname.replace("www.", "");
        } catch {
          titulo = url;
        }
      }
      return { n: f.n, titulo: titulo || `Fonte ${f.n}`, url };
    });

    // Fontes citadas pela API que o modelo não numerou
    citations.forEach((url, i) => {
      if (!sources.some((s) => s.url === url)) {
        let titulo = url;
        try {
          titulo = new URL(url).hostname.replace("www.", "");
        } catch { /* mantém a url */ }
        sources.push({ n: sources.length + 1, titulo, url });
      }
      void i;
    });

    const payload = { bairro: neighborhood, cidade: city, finalidade, secoes };
    const generated_at = new Date().toISOString();

    if (admin) {
      const { error: upsertError } = await admin
        .from("market_insights")
        .upsert(
          {
            bairro: neighborhood,
            cidade: city,
            finalidade,
            payload,
            sources,
            model: data.model ?? "sonar",
            generated_at,
          },
          { onConflict: "bairro,cidade,finalidade" },
        );
      if (upsertError) console.error("market_insights upsert error:", upsertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        payload,
        sources,
        model: data.model ?? "sonar",
        generated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("market-intel error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
