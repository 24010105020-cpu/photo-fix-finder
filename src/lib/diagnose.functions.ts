import { createServerFn } from "@tanstack/react-start";

export const diagnoseDevice = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string; deviceHint?: string }) => {
    if (!input?.imageDataUrl || typeof input.imageDataUrl !== "string") {
      throw new Error("imageDataUrl is required");
    }
    if (input.imageDataUrl.length > 12_000_000) {
      throw new Error("Image too large (max ~9MB)");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert mobile/laptop/tablet repair technician.
You will be shown a photo of a device (phone, tablet, laptop, monitor, console, etc.).
Identify any visible problems (cracked screen, black screen, water damage, bent frame,
broken back glass, dead pixels, missing buttons, swollen battery, etc.).

Respond by calling the report_diagnosis function with:
- device: short identification (e.g. "iPhone 13 Pro", "Samsung laptop", "unknown smartphone")
- problems: array of detected issues, each with name, severity (low|medium|high), description, likely_cause
- estimated_price_usd: { min: number, max: number } for total repair cost in USD
- repair_time: human estimate (e.g. "1-2 hours", "2-3 days")
- confidence: low | medium | high
- recommendation: short next-step advice for the user

If the image is not a device or is unclear, return problems: [] and explain in recommendation.
Be realistic with USD pricing based on typical third-party repair shop rates.`;

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
            { type: "image_url", image_url: { url: data.imageDataUrl } },
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
                recommendation: { type: "string" },
              },
              required: [
                "device",
                "problems",
                "estimated_price_usd",
                "repair_time",
                "confidence",
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

    try {
      return JSON.parse(toolCall.function.arguments) as {
        device: string;
        problems: Array<{
          name: string;
          severity: "low" | "medium" | "high";
          description: string;
          likely_cause: string;
        }>;
        estimated_price_usd: { min: number; max: number };
        repair_time: string;
        confidence: "low" | "medium" | "high";
        recommendation: string;
      };
    } catch (e) {
      console.error("Failed to parse tool args", e);
      throw new Error("Invalid diagnosis format. Please retry.");
    }
  });