import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const IMAGE_MODEL_FALLBACKS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
];
const TEXT_MODEL = "google/gemini-2.5-flash";

function extractImageUrl(data: any): string | undefined {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return undefined;
  // Shape 1: message.images[]
  const fromImages = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url;
  if (typeof fromImages === "string" && fromImages.startsWith("data:image/")) return fromImages;
  // Shape 2: message.content can be a string OR an array of parts
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      const u = part?.image_url?.url || part?.image_url;
      if (typeof u === "string" && u.startsWith("data:image/")) return u;
    }
  }
  return undefined;
}

function extractText(data: any): string | undefined {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return undefined;
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join(" ").trim() || undefined;
  }
  return undefined;
}

async function callImageAIOnce(model: string, content: any): Promise<{ dataUrl?: string; error?: string; textReply?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { error: "LOVABLE_API_KEY not configured" };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) return { error: "Rate limit hit, please wait a moment." };
    if (res.status === 402) return { error: "AI credits exhausted. Add credits in workspace settings." };
    const body = await res.text();
    console.error("AI error", model, res.status, body.slice(0, 500));
    return { error: `AI error (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const url = extractImageUrl(data);
  const textReply = extractText(data);
  if (!url) {
    console.error("AI returned no image", model, JSON.stringify(data).slice(0, 1200));
    return { error: textReply ? `AI declined: ${textReply.slice(0, 180)}` : "AI returned no image.", textReply };
  }
  return { dataUrl: url };
}

async function callImageAI(content: any): Promise<{ dataUrl?: string; error?: string }> {
  let lastErr: string | undefined;
  const tried = [IMAGE_MODEL, ...IMAGE_MODEL_FALLBACKS];
  for (const m of tried) {
    const r = await callImageAIOnce(m, content);
    if (r.dataUrl) return r;
    lastErr = r.error || lastErr;
    console.warn("[ai] model", m, "returned no image, trying next");
  }
  return { error: lastErr || "AI returned no image. Try a different prompt." };
}

const FRAMING = `FULL BODY shot from the very top of the head to the soles of both feet, both feet fully visible inside the frame, generous headroom and footroom, vertical 3:4 portrait orientation, the subject occupies roughly 80% of the frame height and is centered, ABSOLUTELY NO cropping of head, hands, or feet.`;

const BASE_PROMPT = `Photorealistic editorial fashion lookbook photograph, modest and SFW. ${FRAMING} Single subject centered on a neutral seamless studio backdrop (soft warm gray), soft diffused studio lighting, sharp focus, high detail skin texture, natural human proportions, looking confidently at camera. The subject is wearing a plain neutral beige fitted athletic base layer that fully covers the torso from collarbone to upper thigh (a snug crew-neck short-sleeve top tucked into matching high-waist fitted shorts), similar to seamless activewear. This is a fitting reference photo for catalog use. Fully clothed in the base layer, no skin exposed beyond a typical activewear silhouette. Keep the background clean and minimal so the subject can later be dressed in different garments.`;

export const generateModel = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; pose?: string }) =>
    z.object({ prompt: z.string().min(2).max(500), pose: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const poseLine = data.pose ? `Pose: ${data.pose}.` : "Pose: standing neutral, arms relaxed at sides.";
    const prompt = `${BASE_PROMPT}\n\nSubject description: ${data.prompt}.\n${poseLine}`;
    return callImageAI(prompt);
  });

const KEEP = `Preserve the model's face, body shape, skin tone, hair, pose, lighting, and the studio background. Maintain ${FRAMING} Photorealistic editorial catalog style, modest and SFW, seamless, no collage artifacts.`;

function garmentPlacement(category: string) {
  const c = category.toLowerCase();
  if (c.includes("top") || c.includes("jacket")) return "upper body garment covering the chest and torso";
  if (c.includes("bottom")) return "lower body garment covering the waist, hips, and legs as appropriate";
  if (c.includes("dress")) return "full outfit garment covering the torso and lower body";
  if (c.includes("shoe")) return "footwear placed on both feet";
  return "fashion item placed naturally on the matching body area";
}

function isFetchableUrl(u: string) {
  return u.startsWith("https://") || u.startsWith("http://") || u.startsWith("data:image/");
}

export const applyGarment = createServerFn({ method: "POST" })
  .inputValidator((d: {
    baseImageUrl: string;
    garmentImageUrl: string;
    garmentName: string;
    garmentCategory: string;
    modelPrompt?: string;
    modelPose?: string;
    extraInstruction?: string;
  }) =>
    z.object({
      baseImageUrl: z.string().min(5),
      garmentImageUrl: z.string().min(5),
      garmentName: z.string().max(120),
      garmentCategory: z.string().max(60),
      modelPrompt: z.string().max(500).optional(),
      modelPose: z.string().max(80).optional(),
      extraInstruction: z.string().max(400).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!isFetchableUrl(data.baseImageUrl)) return { error: "Model image URL is not fetchable. Regenerate the model." };
    if (!isFetchableUrl(data.garmentImageUrl)) return { error: "Garment image URL is not fetchable. Re-upload the item." };

    const text = `Create one safe fashion catalog virtual try-on image.

IMAGE 1 is a fully clothed fitting model wearing a neutral base layer.
IMAGE 2 is a product/reference photo for the garment only; ignore any person, skin, body, pose, or background in IMAGE 2.

Edit IMAGE 1 so the model is wearing the garment from IMAGE 2: "${data.garmentName}" (${data.garmentCategory}), as a ${garmentPlacement(data.garmentCategory)}. Copy the garment's color, fabric, print, neckline, sleeves, lacing, buttons, trims, and silhouette. Replace the neutral base layer only where this garment covers it; keep all other base-layer coverage modest and fully clothed. Do not output the original unedited model image. ${data.extraInstruction || ""}

${KEEP}

Output: a single photorealistic edited image of the person wearing the new garment.`;
    console.log("[applyGarment] base=", data.baseImageUrl.slice(0, 80), "garment=", data.garmentImageUrl.slice(0, 80));
    const edited = await callImageAI([
      { type: "text", text },
      { type: "image_url", image_url: { url: data.baseImageUrl } },
      { type: "image_url", image_url: { url: data.garmentImageUrl } },
    ]);
    if (edited.dataUrl || !data.modelPrompt) return edited;

    const fallbackText = `Create one safe photorealistic fashion catalog image. ${FRAMING}

Subject description: ${data.modelPrompt}.
Pose: ${data.modelPose || "standing neutral, arms relaxed at sides"}.

Use the attached product/reference image as the garment reference only. Ignore any person, body, skin, pose, or background in that reference. Dress the subject in "${data.garmentName}" (${data.garmentCategory}) as a ${garmentPlacement(data.garmentCategory)}. Copy the garment's color, fabric, print, neckline, sleeves, lacing, buttons, trims, and silhouette. Keep the outfit fully clothed, modest, and SFW; add neutral fitted coverage underneath only where needed. Neutral seamless studio backdrop, soft diffused light, editorial catalog styling.`;
    console.warn("[applyGarment] edit returned no image, regenerating dressed model from garment reference");
    return callImageAI([
      { type: "text", text: fallbackText },
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

const ALLOWED_CATEGORIES = [
  "Tops","Bottoms","Dresses","Jackets","Shoes","Swimwear","Lingerie",
  "Bags","Jewelry","Hats","Belts","Gloves","Socks",
  "Hair accessories","Tech accessories","Wrestling gear","Costumes","Props",
];

export const analyzeGarment = createServerFn({ method: "POST" })
  .inputValidator((d: { imageUrl: string }) => z.object({ imageUrl: z.string().min(5) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { error: "LOVABLE_API_KEY not configured" };
    if (!isFetchableUrl(data.imageUrl)) return { error: "Image URL not fetchable" };

    const sys = `You are a fashion product cataloger. Look at the garment/accessory image and return a compact JSON object with: name (short descriptive product name like "Black lace corset top"), category (MUST be one of: ${ALLOWED_CATEGORIES.join(", ")}), brand (visible brand name from logo/text, or empty string), color (single dominant color word), tags (array of 3-6 lowercase style tags, e.g. ["lace","goth","corset"]). Respond ONLY with valid JSON, no markdown.`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: [
            { type: "text", text: "Catalog this item." },
            { type: "image_url", image_url: { url: data.imageUrl } },
          ]},
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("analyzeGarment error", res.status, body);
      return { error: `AI error (${res.status})` };
    }
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const category = ALLOWED_CATEGORIES.includes(parsed?.category) ? parsed.category : "Tops";
      return {
        name: String(parsed?.name || "").slice(0, 80),
        category,
        brand: String(parsed?.brand || "").slice(0, 60),
        color: String(parsed?.color || "").slice(0, 30),
        tags: Array.isArray(parsed?.tags) ? parsed.tags.map((t: any) => String(t).toLowerCase().slice(0, 24)).slice(0, 6) : [],
      };
    } catch (e) {
      console.error("analyzeGarment parse fail", raw);
      return { error: "Could not parse AI response" };
    }
  });

export const mirrorRemoteImage = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await fetch(data.url);
      if (!r.ok) return { error: `Could not fetch image (${r.status})` };
      const ct = r.headers.get("content-type") || "image/jpeg";
      if (!ct.startsWith("image/")) return { error: "URL is not an image" };
      const buf = await r.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return { dataUrl: `data:${ct};base64,${b64}` };
    } catch (e: any) {
      return { error: e?.message || "Fetch failed" };
    }
  });
