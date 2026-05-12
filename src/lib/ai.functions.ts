import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-image";

async function callImageAI(content: any): Promise<{ dataUrl?: string; error?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { error: "LOVABLE_API_KEY not configured" };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) return { error: "Rate limit hit, please wait a moment." };
    if (res.status === 402) return { error: "AI credits exhausted. Add credits in workspace settings." };
    const body = await res.text();
    console.error("AI error", res.status, body);
    return { error: `AI error (${res.status})` };
  }

  const data = await res.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) {
    console.error("AI returned no image", JSON.stringify(data).slice(0, 500));
    return { error: "AI returned no image. Try a different prompt." };
  }
  return { dataUrl: url };
}

const BASE_PROMPT = `Photorealistic editorial fashion photography, full-body shot, single subject centered, neutral seamless studio backdrop (soft warm gray), soft diffused studio lighting, sharp focus, high detail skin texture, natural proportions, looking confidently at camera. The subject MUST be wearing simple plain neutral-tone undergarments only — for femme/female bodies a basic beige bra and briefs; for masc/male bodies plain beige boxer briefs; choose what fits the description. ABSOLUTELY NO NUDITY, no exposed nipples or genitals. Keep the background clean and minimal so the model can later be dressed in different garments.`;

export const generateModel = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; pose?: string }) =>
    z.object({ prompt: z.string().min(2).max(500), pose: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const poseLine = data.pose ? `Pose: ${data.pose}.` : "Pose: standing neutral, arms relaxed at sides.";
    const prompt = `${BASE_PROMPT}\n\nSubject description: ${data.prompt}.\n${poseLine}`;
    return callImageAI(prompt);
  });

const KEEP = `Preserve the model's face, body shape, skin tone, hair, pose, lighting, and the studio background EXACTLY. Photorealistic, seamless, no collage artifacts.`;

export const applyGarment = createServerFn({ method: "POST" })
  .inputValidator((d: {
    baseImageUrl: string;
    garmentImageUrl: string;
    garmentName: string;
    garmentCategory: string;
    extraInstruction?: string;
  }) =>
    z.object({
      baseImageUrl: z.string().min(5),
      garmentImageUrl: z.string().min(5),
      garmentName: z.string().max(120),
      garmentCategory: z.string().max(60),
      extraInstruction: z.string().max(400).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const cat = data.garmentCategory.toLowerCase();
    let removalNote = "";
    if (["tops", "dresses", "swimwear", "lingerie", "jackets", "costumes"].some((c) => cat.includes(c.toLowerCase()))) {
      removalNote += " Remove any previously visible bra/undershirt only if this garment covers the torso.";
    }
    if (["bottoms", "dresses", "swimwear", "lingerie", "costumes"].some((c) => cat.includes(c.toLowerCase()))) {
      removalNote += " Remove any previously visible briefs only if this garment covers the lower body.";
    }
    const text = `Dress the person in the FIRST image with the garment shown in the SECOND image (a "${data.garmentName}", category: ${data.garmentCategory}). Match the garment's exact fabric, print, color, cut, and details. Fit it naturally to the body and pose.${removalNote} ${data.extraInstruction || ""} ${KEEP}`;
    return callImageAI([
      { type: "text", text },
      { type: "image_url", image_url: { url: data.baseImageUrl } },
      { type: "image_url", image_url: { url: data.garmentImageUrl } },
    ]);
  });

export const restyleLook = createServerFn({ method: "POST" })
  .inputValidator((d: { baseImageUrl: string; instruction: string }) =>
    z.object({ baseImageUrl: z.string().min(5), instruction: z.string().min(2).max(400) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = `Adjust the styling of the outfit in this image: ${data.instruction}. Do not add or remove garments unless explicitly asked. ${KEEP}`;
    return callImageAI([
      { type: "text", text },
      { type: "image_url", image_url: { url: data.baseImageUrl } },
    ]);
  });
