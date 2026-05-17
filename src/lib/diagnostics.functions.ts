import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  imageUrl: z.string().url().max(2048),
  deviceHint: z.string().max(500).optional(),
});

export type Diagnostic = {
  id: string;
  user_id: string;
  image_url: string | null;
  device_type: string | null;
  ai_diagnosis: string | null;
  problems: Array<{
    name: string;
    severity: "low" | "medium" | "high";
    description: string;
    likely_cause: string;
  }>;
  estimated_repair_cost_min: number | null;
  estimated_repair_cost_max: number | null;
  confidence_score: string | null;
  repair_urgency: string | null;
  recommended_solution: string | null;
  repair_time: string | null;
  created_at: string;
};

export const diagnoseDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert mobile/laptop/tablet repair technician.
You will be shown a photo of a device. Identify visible damage (cracked screen,
black screen, water damage, bent frame, swollen battery, etc.) and respond by
calling report_diagnosis. Be realistic about USD pricing from third-party shops.
If the image is not a device, return problems: [] and explain in recommendation.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: data.deviceHint
                ? `User says: "${data.deviceHint}". Diagnose this device.`
                : "Diagnose this device.",
            },
            { type: "image_url", image_url: { url: data.imageUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_diagnosis",
            description: "Return a structured device repair diagnosis.",
            parameters: {
              type: "object",
              properties: {
                device: { type: "string" },
                ai_diagnosis: { type: "string", description: "Plain-English summary of the diagnosis (2-4 sentences)." },
                problems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      description: { type: "string" },
                      likely_cause: { type: "string" },
                    },
                    required: ["name", "severity", "description", "likely_cause"],
                    additionalProperties: false,
                  },
                },
                estimated_price_usd: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" },
                  },
                  required: ["min", "max"],
                  additionalProperties: false,
                },
                repair_time: { type: "string" },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                recommendation: { type: "string" },
              },
              required: [
                "device",
                "ai_diagnosis",
                "problems",
                "estimated_price_usd",
                "repair_time",
                "confidence",
                "urgency",
                "recommendation",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_diagnosis" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace.");
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error("Could not analyze the image. Please try again.");
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a structured diagnosis. Please retry.");
    }

    const parsed = JSON.parse(toolCall.function.arguments) as {
      device: string;
      ai_diagnosis: string;
      problems: Diagnostic["problems"];
      estimated_price_usd: { min: number; max: number };
      repair_time: string;
      confidence: "low" | "medium" | "high";
      urgency: "low" | "medium" | "high" | "critical";
      recommendation: string;
    };

    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("diagnostics")
      .insert({
        user_id: userId,
        image_url: data.imageUrl,
        device_type: parsed.device,
        ai_diagnosis: parsed.ai_diagnosis,
        problems: parsed.problems,
        estimated_repair_cost_min: parsed.estimated_price_usd.min,
        estimated_repair_cost_max: parsed.estimated_price_usd.max,
        confidence_score: parsed.confidence,
        repair_urgency: parsed.urgency,
        recommended_solution: parsed.recommendation,
        repair_time: parsed.repair_time,
      })
      .select()
      .single();

    if (error || !inserted) {
      console.error("Failed to store diagnosis:", error);
      throw new Error("Could not save diagnosis. Please try again.");
    }

    return inserted as Diagnostic;
  });

export const listMyDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("diagnostics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Diagnostic[];
  });

export const getMyDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("diagnostics")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as Diagnostic | null;
  });