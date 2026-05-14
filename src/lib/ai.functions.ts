import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const IMAGE_MODEL_FALLBACKS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
];
const TEXT_MODEL = "google/gemini-2.5-flash";

// Convert any https/http image URL into a base64 data URL.
// Gemini sometimes rejects external URLs with "unsupported image format" / 400.
// Sending the bytes inline is the most reliable path.
async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:image/")) return url;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not fetch image (${r.status})`);
  let ct = r.headers.get("content-type") || "image/jpeg";
  if (!ct.startsWith("image/")) ct = "image/jpeg";
  // Gemini supports png/jpeg/webp/heic. Coerce unknowns to jpeg.
  if (!/^image\/(png|jpe?g|webp|heic|heif|gif)$/i.test(ct)) ct = "image/jpeg";
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked base64 to avoid stack overflow on large images.
  const CHUNK = 8192;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(buf).toString("base64") : btoa(bin);
  return `data:${ct};base64,${b64}`;
}

async function normalizeContent(content: any): Promise<any> {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content;
  const out = [];
  for (const part of content) {
    if (part?.type === "image_url" && part?.image_url?.url) {
      try {
        const dataUrl = await toDataUrl(part.image_url.url);
        out.push({ type: "image_url", image_url: { url: dataUrl } });
      } catch (e) {
        console.error("[ai] image fetch failed", e);
        throw e;
      }
    } else {
      out.push(part);
    }
  }
  return out;
}

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

  let normalized: any;
  try {
    normalized = await normalizeContent(content);
  } catch (e: any) {
    return { error: e?.message || "Could not load reference image" };
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: normalized }],
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

const BASE_PROMPT = `Photorealistic editorial fashion lookbook photograph, modest and SFW. ${FRAMING} Single subject centered on a neutral seamless studio backdrop (soft warm gray), soft diffused studio lighting, sharp focus, high detail skin texture, natural human proportions, looking confidently at camera. The subject is wearing only basic plain neutral undergarments (a simple unbranded soft-cotton bralette or fitted tank-style undershirt and matching plain mid-rise briefs / boxer-briefs in a neutral nude or soft gray tone). This is a fitting base photo for catalog use, similar to a department-store fitting reference. Tasteful, modest, and SFW. Keep the background clean and minimal so the subject can later be dressed in different garments.`;

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

function coverageRule(category: string) {
  const c = category.toLowerCase();
  if (c.includes("top") || c.includes("jacket"))
    return "The new top fully replaces any existing upper-body undergarment in the area it covers — no base bralette/undershirt should remain visible underneath where the garment covers. Keep the lower-body briefs unchanged.";
  if (c.includes("bottom"))
    return "The new bottoms fully replace the base briefs/boxer-briefs in the area they cover — no base underwear should remain visible underneath where the garment covers. Keep the upper-body base layer unchanged.";
  if (c.includes("dress"))
    return "The dress fully replaces the existing base undergarments in the area it covers (both top and bottom).";
  if (c.includes("swim") || c.includes("lingerie"))
    return "The new piece replaces the corresponding base undergarment in the area it covers.";
  return "Layer the item naturally over the base undergarments without removing modest coverage in uncovered areas.";
}

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

IMAGE 1 is a fitting model wearing only plain neutral base undergarments (soft bralette/tank and plain briefs) — this is a catalog fitting base.
IMAGE 2 is a product/reference photo for the garment only; ignore any person, skin, body, pose, or background in IMAGE 2.

Edit IMAGE 1 so the model is wearing the garment from IMAGE 2: "${data.garmentName}" (${data.garmentCategory}), as a ${garmentPlacement(data.garmentCategory)}. Copy the garment's color, fabric, print, neckline, sleeves, lacing, buttons, trims, and silhouette. ${coverageRule(data.garmentCategory)} Keep the result modest and SFW. Do not output the original unedited model image. ${data.extraInstruction || ""}

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
  .inputValidator((d: { imageUrl: string; hints?: Record<string, string | number | undefined> }) =>
    z.object({
      imageUrl: z.string().min(5),
      hints: z.record(z.string(), z.union([z.string(), z.number()]).optional()).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { error: "LOVABLE_API_KEY not configured" };
    if (!isFetchableUrl(data.imageUrl)) return { error: "Image URL not fetchable" };

    // Normalize to data URL — Gateway often rejects external image URLs with 400.
    let imageForAi: string;
    try { imageForAi = await toDataUrl(data.imageUrl); }
    catch (e: any) { return { error: e?.message || "Could not load image" }; }

    const hintLines = data.hints
      ? Object.entries(data.hints)
          .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
      : "";

    const sys = `You are a fashion product cataloger. Look at the garment/accessory image AND any user-provided hints, then return a compact JSON object with these fields:
- name: short descriptive product name (e.g. "Black lace corset top")
- category: MUST be one of: ${ALLOWED_CATEGORIES.join(", ")}
- subcategory: a more specific type within the category (e.g. "Crop top", "Wide-leg jeans", "Sneakers")
- brand: visible brand from logo/text, or "" if none
- color: single dominant color word
- material: primary fabric/material if visible (e.g. "cotton", "leather"), or ""
- gender: one of "Femme", "Masc", "Androgynous", "Unisex", "Kids", "Other"
- season: an array of one or more of "Spring", "Summer", "Fall", "Winter", "All-season"
- price: estimated retail price as a number in USD, or null if you cannot tell
- tags: 3-6 lowercase style tags, e.g. ["lace","goth","corset"]
Use any user hints below as ground truth — do not contradict them; fill the rest from the image.
Hints prefixed "canonical_" come from the official product page/URL and are ABSOLUTE TRUTH — never override or reword them.
Respond ONLY with valid JSON, no markdown.`;

    const userText = hintLines
      ? `Catalog this item. User-provided hints (treat as ground truth):\n${hintLines}`
      : "Catalog this item.";

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageForAi } },
          ]},
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("analyzeGarment error", res.status, body);
      return { error: `AI error (${res.status}): ${body.slice(0, 180)}` };
    }
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const category = ALLOWED_CATEGORIES.includes(parsed?.category) ? parsed.category : "Tops";
      const allowedGender = ["Femme","Masc","Androgynous","Unisex","Kids","Other"];
      const allowedSeason = ["Spring","Summer","Fall","Winter","All-season"];
      let seasonOut = "";
      if (Array.isArray(parsed?.season)) {
        seasonOut = parsed.season.filter((x: any) => allowedSeason.includes(x)).join(", ");
      } else if (typeof parsed?.season === "string" && allowedSeason.includes(parsed.season)) {
        seasonOut = parsed.season;
      }
      const priceNum = typeof parsed?.price === "number" ? parsed.price
        : typeof parsed?.price === "string" && parsed.price.trim() !== "" && !isNaN(Number(parsed.price)) ? Number(parsed.price)
        : null;
      return {
        name: String(parsed?.name || "").slice(0, 80),
        category,
        subcategory: String(parsed?.subcategory || "").slice(0, 60),
        brand: String(parsed?.brand || "").slice(0, 60),
        color: String(parsed?.color || "").slice(0, 30),
        material: String(parsed?.material || "").slice(0, 40),
        gender: allowedGender.includes(parsed?.gender) ? parsed.gender : "",
        season: seasonOut,
        price: priceNum,
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

// Fetch a product page and extract canonical info from meta tags + JSON-LD.
// Used as ground truth that overrides AI vision guesses.
export const fetchProductInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await fetch(data.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LookbookBot/1.0)" },
        redirect: "follow",
      });
      if (!r.ok) return { error: `Could not load page (${r.status})` };
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("text/html")) return { error: "Not an HTML page" };
      const html = (await r.text()).slice(0, 500_000);

      const meta = (prop: string) => {
        const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
        const m = html.match(re); return m ? m[1].trim() : "";
      };
      const metaRev = (prop: string) => {
        const re = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
        const m = html.match(re); return m ? m[1].trim() : "";
      };
      const get = (p: string) => meta(p) || metaRev(p);

      const result: Record<string, string | number> = {};
      const title = get("og:title") || get("twitter:title") || (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "").trim();
      const desc  = get("og:description") || get("twitter:description") || get("description");
      const brand = get("product:brand") || get("og:brand") || get("brand");
      const price = get("product:price:amount") || get("og:price:amount") || get("price");
      const color = get("product:color") || get("color");
      const material = get("product:material") || get("material");

      if (title) result.name = title.slice(0, 120);
      if (brand) result.brand = brand.slice(0, 60);
      if (color) result.color = color.slice(0, 30);
      if (material) result.material = material.slice(0, 40);
      if (price && !isNaN(Number(price))) result.price = Number(price);
      if (desc)  result.description = desc.slice(0, 400);

      // JSON-LD Product schema
      const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      for (const m of ldMatches) {
        try {
          const blob = JSON.parse(m[1].trim());
          const items = Array.isArray(blob) ? blob : (blob["@graph"] || [blob]);
          for (const it of items) {
            const t = it?.["@type"];
            const isProduct = t === "Product" || (Array.isArray(t) && t.includes("Product"));
            if (!isProduct) continue;
            if (it.name && !result.name) result.name = String(it.name).slice(0, 120);
            const b = typeof it.brand === "string" ? it.brand : it.brand?.name;
            if (b && !result.brand) result.brand = String(b).slice(0, 60);
            if (it.color && !result.color) result.color = String(it.color).slice(0, 30);
            if (it.material && !result.material) result.material = String(it.material).slice(0, 40);
            const offer = Array.isArray(it.offers) ? it.offers[0] : it.offers;
            const p = offer?.price ?? offer?.lowPrice;
            if (p && !result.price && !isNaN(Number(p))) result.price = Number(p);
            if (it.category && !result.subcategory) result.subcategory = String(it.category).slice(0, 60);
          }
        } catch { /* ignore bad JSON-LD */ }
      }

      return { info: result };
    } catch (e: any) {
      return { error: e?.message || "Fetch failed" };
    }
  });
