import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnalystLiteResponse {
  mode: "education" | "diagnostic" | "overview" | "risk_alert";
  summary: string;
  disclaimer: string;
  kpis?: Record<string, number>;
  cards?: Array<{ type: string; [key: string]: any }>;
  actions?: Array<{ label: string; target: string }>;
  sources?: Array<{ kind: string; id?: string; title?: string }>;
  error?: string;
}

function classifyIntent(prompt: string): "education" | "diagnostic" | "overview" | "risk_alert" {
  const p = prompt.toLowerCase();
  if (p.includes("risk") || p.includes("scared") || p.includes("losing")) return "risk_alert";
  if (p.includes("why") || p.includes("what happened")) return "diagnostic";
  if (p.includes("portfolio") || p.includes("overview")) return "overview";
  return "education";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const body = await req.json().catch(() => ({}));
    const message: string = body.message;
    const persona: string = body.persona ?? "strategic";

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          mode: "education",
          summary: "Please provide a valid message for the Analyst.",
          disclaimer: "Educational only. Not financial advice.",
          error: "missing_message",
        } as AnalystLiteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = `You are StagAlgo Analyst, a Strategic Financial Analyst assistant.

- You DO NOT give direct financial advice or trade instructions.
- You explain concepts, scenarios, risks, and possibilities.
- Be concise, analytical, and data-driven like a professional financial analyst.
- The user may be a beginner or intermediate trader.
- Focus on education, risk awareness, and strategic thinking.

You MUST respond in plain English. Keep responses focused and actionable.`;

    const intent = classifyIntent(message);

    console.log("Analyst Lite processing:", { message: message.substring(0, 50), intent });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text();
      console.error("OpenAI error:", openaiResponse.status, text);
      throw new Error("OpenAI API error");
    }

    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ??
      "I had trouble generating a response. Please try again.";

    console.log("Analyst Lite success:", { responseLength: content.length });

    const res: AnalystLiteResponse = {
      mode: intent,
      summary: content,
      disclaimer: "Educational only. Not financial advice.",
      sources: [{ kind: "System", title: "Analyst Lite" }],
    };

    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analyst-lite error:", err);

    const fallback: AnalystLiteResponse = {
      mode: "education",
      summary:
        "I ran into an issue processing your request. Please try again in a moment or rephrase your question.",
      disclaimer: "Educational only. Not financial advice.",
      error: "server_error",
      sources: [{ kind: "System", title: "Error Handler" }],
    };

    return new Response(JSON.stringify(fallback), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
