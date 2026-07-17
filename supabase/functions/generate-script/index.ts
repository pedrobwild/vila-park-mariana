import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em vendas consultivas de studios urbanos para investimento (short stay / Airbnb).

Gere um ROTEIRO DE REUNIÃO completo e prático para um corretor da incorporadora, adaptado ao perfil de personalidade do cliente.

O roteiro deve seguir esta estrutura:

## ABERTURA (2-3 minutos)
Como quebrar o gelo e estabelecer rapport com este perfil específico.

## DIAGNÓSTICO (5-7 minutos)
Perguntas-chave para entender as necessidades e identificar o momento de compra deste perfil. Inclua perguntas que revelem objeções ocultas.

## APRESENTAÇÃO DO PRODUTO (10-15 minutos)
Quais argumentos priorizar para este perfil. Em que ordem apresentar. O que NÃO falar (armadilhas).

## TRATAMENTO DE OBJEÇÕES
Para cada objeção esperada deste perfil, a resposta ideal com tom e abordagem adaptados.

## SINAIS DE COMPRA — O QUE OBSERVAR
Comportamentos específicos que indicam que este perfil está pronto para fechar.

## FECHAMENTO
Técnica de fechamento mais eficaz para este perfil. Frase-gatilho recomendada. Como conduzir para a assinatura.

## PÓS-REUNIÃO
Follow-up ideal: timing, canal, mensagem.

REGRAS:
- Seja extremamente prático e direto — o corretor vai ler isso 5 minutos antes da reunião
- Use linguagem natural, como se estivesse treinando o corretor pessoalmente
- Inclua frases prontas que o corretor pode usar literalmente
- Adapte o tom ao perfil (ex: analítico = dados e planilhas; cauteloso = segurança e garantias)
- Escreva em português do Brasil
- Use markdown para formatação`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const profileType = typeof body.profileType === "string" ? body.profileType.slice(0, 200) : "";
    const profileData = body.profileData && typeof body.profileData === "object" ? body.profileData : null;
    const dashboardContext = body.dashboardContext && typeof body.dashboardContext === "object" ? body.dashboardContext : null;

    if (!profileType) {
      return new Response(JSON.stringify({ error: "profileType é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from dashboard data
    const contextParts: string[] = [];

    if (profileData) {
      contextParts.push(`PERFIL SELECIONADO: ${profileData.type}\nDescrição: ${profileData.description}\nEstratégia: ${profileData.approachStrategy}\nArmadilhas: ${profileData.pitfalls}`);
    }

    if (dashboardContext?.objections?.length) {
      contextParts.push(`OBJEÇÕES CONHECIDAS:\n${dashboardContext.objections.map((o: any) => `- [${o.frequency}] ${o.objection} → Rebater: ${o.rebuttal}`).join("\n")}`);
    }

    if (dashboardContext?.hiddenObjections?.length) {
      contextParts.push(`OBJEÇÕES OCULTAS:\n${dashboardContext.hiddenObjections.map((h: any) => `- ${h.objection} | Sinais: ${h.signals} | Abordagem: ${h.approach}`).join("\n")}`);
    }

    if (dashboardContext?.closingArguments?.length) {
      contextParts.push(`ARGUMENTOS DE FECHAMENTO:\n${dashboardContext.closingArguments.map((a: any) => `- [${a.effectiveness}] ${a.argument} — Contexto: ${a.context}`).join("\n")}`);
    }

    if (dashboardContext?.buyingSignals?.length) {
      contextParts.push(`SINAIS DE COMPRA:\n${dashboardContext.buyingSignals.map((s: any) => `- ${s.signal} → Ação: ${s.action}`).join("\n")}`);
    }

    if (dashboardContext?.topQuestions?.length) {
      contextParts.push(`PERGUNTAS FREQUENTES:\n${dashboardContext.topQuestions.map((q: any) => `- "${q.question}" → Resposta: ${q.idealAnswer}`).join("\n")}`);
    }

    if (dashboardContext?.buyerPersona) {
      const bp = dashboardContext.buyerPersona;
      contextParts.push(`PERFIL DO COMPRADOR: ${bp.summary}\nTicket: ${bp.avgTicket}\nMotivações: ${bp.motivations?.join(", ")}`);
    }

    const userPrompt = `Gere um roteiro de reunião completo para um corretor que vai atender um cliente com perfil "${profileType}".

${contextParts.join("\n\n")}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    // Stream through to client
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("generate-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
