import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasCredits, consumeCreditFor } from "./credits.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-2.5-flash";

// ============================================================
// OpenAI gpt-image-1 pipeline
// ============================================================
const OPENAI_BASE = "https://api.openai.com/v1";
const OPENAI_IMAGE_MODEL = "gpt-image-1";

async function urlToFile(url: string, name: string): Promise<File> {
  let blob: Blob;
  if (url.startsWith("data:image/")) {
    const [meta, b64] = url.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: mime });
  } else {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Could not fetch reference image (${r.status})`);
    const buf = await r.arrayBuffer();
    let ct = r.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) ct = "image/png";
    blob = new Blob([buf], { type: ct });
  }
  const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
  return new File([blob], `${name}.${ext}`, { type: blob.type });
}

function b64ToDataUrl(b64: string, mime = "image/png") {
  return `data:${mime};base64,${b64}`;
}

type ImageResult = { dataUrl?: string; error?: string };

async function openaiGenerate(prompt: string, size = "1024x1536"): Promise<ImageResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "OPENAI_API_KEY not configured" };
  const res = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, size, n: 1, quality: "high" }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[openai gen]", res.status, body.slice(0, 500));
    if (res.status === 429) return { error: "OpenAI rate limit hit. Try again shortly." };
    if (res.status === 401) return { error: "OpenAI key invalid." };
    return { error: `OpenAI error (${res.status}): ${body.slice(0, 200)}` };
  }
  const j: any = await res.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) return { error: "OpenAI returned no image." };
  return { dataUrl: b64ToDataUrl(b64) };
}

async function openaiEdit(prompt: string, imageUrls: string[], size = "1024x1536"): Promise<ImageResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "OPENAI_API_KEY not configured" };
  const fd = new FormData();
  fd.append("model", OPENAI_IMAGE_MODEL);
  fd.append("prompt", prompt);
  fd.append("size", size);
  fd.append("n", "1");
  fd.append("quality", "high");
  try {
    for (let i = 0; i < imageUrls.length; i++) {
      const file = await urlToFile(imageUrls[i], `ref_${i}`);
      fd.append("image[]", file);
    }
  } catch (e: any) {
    return { error: e?.message || "Could not load reference image" };
  }
  const res = await fetch(`${OPENAI_BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[openai edit]", res.status, body.slice(0, 500));
    if (res.status === 429) return { error: "OpenAI rate limit hit. Try again shortly." };
    if (res.status === 401) return { error: "OpenAI key invalid." };
    return { error: `OpenAI error (${res.status}): ${body.slice(0, 200)}` };
  }
  const j: any = await res.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) return { error: "OpenAI returned no image." };
  return { dataUrl: b64ToDataUrl(b64) };
}

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:image/")) return url;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not fetch image (${r.status})`);
  let ct = r.headers.get("content-type") || "image/jpeg";
  if (!ct.startsWith("image/")) ct = "image/jpeg";
  if (!/^image\/(png|jpe?g|webp|heic|heif|gif)$/i.test(ct)) ct = "image/jpeg";
  const buf = await r.arrayBuffer();
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(buf).toString("base64") : "";
  return `data:${ct};base64,${b64}`;
}

/** Charge the user one credit only after a successful generation. */
async function withCredit<T extends ImageResult>(userId: string, fn: () => Promise<T>): Promise<T> {
  if (!(await hasCredits(userId, 1))) {
    return { error: "Out of credits. Top up in Workspace settings." } as T;
  }
  const res = await fn();
  if (res?.dataUrl && !res.error) {
    try { await consumeCreditFor(userId, 1); } catch (e) { console.error("[credit] consume failed", e); }
  }
  return res;
}

const FRAMING = `FULL BODY shot from the very top of the head to the soles of both feet, both feet fully visible inside the frame, generous headroom and footroom, vertical 3:4 portrait orientation, the subject occupies roughly 80% of the frame height and is centered, ABSOLUTELY NO cropping of head, hands, or feet.`;

const BASE_PROMPT = `Photorealistic editorial fashion lookbook photograph, modest and SFW. ${FRAMING} Single subject centered on a neutral seamless studio backdrop (soft warm gray), soft diffused studio lighting, sharp focus, high detail skin texture, natural human proportions, looking confidently at camera. The subject is wearing only basic plain neutral undergarments (a simple unbranded soft-cotton bralette or fitted tank-style undershirt and matching plain mid-rise briefs / boxer-briefs in a neutral nude or soft gray tone). This is a fitting base photo for catalog use. Tasteful, modest, and SFW. Keep the background clean and minimal so the subject can later be dressed in different garments.`;

const CHILD_BASE_PROMPT = `Photorealistic editorial children's lookbook photograph, fully modest, age-appropriate and SFW. ${FRAMING} Single child subject centered on a neutral seamless studio backdrop (soft warm gray), soft diffused studio lighting, sharp focus, natural proportions, calm friendly expression. The child is wearing a simple plain fitted cotton tank top and modest knee-length athletic shorts in a neutral soft gray or sand tone — fully covering torso and upper legs (NO underwear-only, NO swimwear, NO bare midriff, NO bare thighs above the knee). This is a fitting base photo for a kids' catalog. Tasteful, modest, age-appropriate, no sexualization, no makeup, no jewelry.`;

const INFANT_FRAMING = `Top-down (overhead) photograph looking straight down at the infant lying flat on a soft neutral blanket. The entire baby from head to toes is fully inside the frame with generous margin, vertical 3:4 orientation, infant centered, no cropping of head, hands, or feet.`;

const INFANT_BASE_PROMPT = `Photorealistic editorial baby/infant catalog photograph, fully modest, age-appropriate and SFW. ${INFANT_FRAMING} Single calm infant lying on their back on a soft cream or oatmeal knit blanket, neutral seamless backdrop, soft diffused natural light, sharp focus, gentle peaceful expression. The infant is wearing a plain neutral short-sleeve cotton onesie/bodysuit in a soft natural tone, fully covering torso and diaper area. NO bare diaper, NO underwear-only, NO swimwear, NO suggestive posing. Hands and feet visible and relaxed. This is a fitting base photo for a baby clothing catalog so the infant can later be dressed in different baby garments.`;

const KEEP_INFANT = `Preserve the infant's face, body proportions, skin tone, hair, pose, blanket, lighting, and the soft neutral backdrop. Maintain ${INFANT_FRAMING} Photorealistic editorial baby catalog style, fully modest, age-appropriate, SFW, no collage artifacts. Render the garment ACCURATELY on the infant.`;

const KEEP = `Preserve the model's face, body shape, skin tone, hair, pose, lighting, and the studio background. Maintain ${FRAMING} Photorealistic editorial catalog style, modest and SFW, seamless, no collage artifacts.`;

const IDENTITY = `Preserve EXACTLY the person's face, identity, ethnicity, body proportions, skin tone, hair, hands, and pose unless explicitly instructed otherwise. Photorealistic fashion-editorial photography, soft studio lighting, magazine-quality fabric rendering.`;

const SKIN_BLEND = `Blend skin smoothly at every exposed garment edge (neckline, sleeves, hem, waistline, ankles, wrists). Match the person's existing skin tone, undertones, lighting, and shadows. No hard seams, no color banding, no mismatched skin patches where skin meets fabric.`;

// Garment slot system: prevents top from wiping pants, shoes from wiping dress, etc.
type Slot = "top" | "bottom" | "dress" | "outer" | "shoes" | "hat" | "accessory" | "swim" | "lingerie";
function slotFor(category: string, subcategory?: string): Slot {
  const c = `${category} ${subcategory || ""}`.toLowerCase();
  if (/dress|jumpsuit|romper|gown/.test(c)) return "dress";
  if (/jacket|coat|blazer|cardigan|outer/.test(c)) return "outer";
  if (/swim|bikini/.test(c)) return "swim";
  if (/lingerie|underwear/.test(c)) return "lingerie";
  if (/shoe|boot|sneaker|sandal|heel|footwear/.test(c)) return "shoes";
  if (/hat|cap|beanie|headwear/.test(c)) return "hat";
  if (/bag|jewelry|belt|scarf|sunglass|tie|glove|sock|accessor/.test(c)) return "accessory";
  if (/bottom|pant|jean|skirt|short|trouser|legging/.test(c)) return "bottom";
  return "top";
}
const SLOT_REGION: Record<Slot, string> = {
  top: "upper body (chest, torso, arms as appropriate)",
  bottom: "lower body (waist, hips, legs)",
  dress: "full torso AND lower body as a single garment",
  outer: "outermost upper layer over any existing top",
  shoes: "both feet",
  hat: "head only",
  accessory: "the natural body area for this accessory",
  swim: "the area normally covered by swimwear",
  lingerie: "the area normally covered by lingerie",
};
function keepOtherSlots(thisSlot: Slot): string {
  const all: Slot[] = ["top","bottom","outer","shoes","hat","accessory"];
  const keep = all.filter((s) => {
    if (s === thisSlot) return false;
    if (thisSlot === "dress" && (s === "top" || s === "bottom")) return false;
    return true;
  });
  if (keep.length === 0) return "";
  return `Do NOT change or remove any other garments on the subject (keep their current ${keep.join(", ")} exactly as-is, including color, pattern, fit, and texture).`;
}

function isFetchableUrl(u: string) {
  return u.startsWith("https://") || u.startsWith("http://") || u.startsWith("data:image/");
}

export const generateModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; pose?: string; isChild?: boolean; isInfant?: boolean }) =>
    z.object({ prompt: z.string().min(2).max(500), pose: z.string().max(80).optional(), isChild: z.boolean().optional(), isInfant: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const base = data.isInfant ? INFANT_BASE_PROMPT : data.isChild ? CHILD_BASE_PROMPT : BASE_PROMPT;
    const poseLine = data.isInfant
      ? "Pose: infant lying calmly on back, top-down camera angle."
      : (data.pose ? `Pose: ${data.pose}.` : "Pose: standing neutral, arms relaxed at sides.");
    const prompt = `${base}\n\nSubject description: ${data.prompt}.\n${poseLine}\n\n${IDENTITY}\n${SKIN_BLEND}`;
    return withCredit(context.userId, () => openaiGenerate(prompt));
  });

export const applyGarment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    baseImageUrl: string;
    garmentImageUrl: string;
    garmentName: string;
    garmentCategory: string;
    garmentSubcategory?: string;
    modelPrompt?: string;
    modelPose?: string;
    extraInstruction?: string;
    isInfant?: boolean;
  }) =>
    z.object({
      baseImageUrl: z.string().min(5),
      garmentImageUrl: z.string().min(5),
      garmentName: z.string().max(120),
      garmentCategory: z.string().max(60),
      garmentSubcategory: z.string().max(60).optional(),
      modelPrompt: z.string().max(500).optional(),
      modelPose: z.string().max(80).optional(),
      extraInstruction: z.string().max(400).optional(),
      isInfant: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!isFetchableUrl(data.baseImageUrl)) return { error: "Model image URL is not fetchable. Regenerate the model." };
    if (!isFetchableUrl(data.garmentImageUrl)) return { error: "Garment image URL is not fetchable. Re-upload the item." };

    const slot = slotFor(data.garmentCategory, data.garmentSubcategory);
    const region = SLOT_REGION[slot];
    const layering = keepOtherSlots(slot);

    const baseDesc = data.isInfant
      ? "IMAGE 1 is a baby/infant photographed top-down lying on a soft blanket — this is the live fitting subject."
      : "IMAGE 1 is the live fitting subject — preserve their face, identity, body, and current outfit exactly.";

    const prompt = `Create one safe photorealistic fashion catalog virtual try-on edit.

${baseDesc}
IMAGE 2 is a product/reference photo for the garment ONLY — ignore any person, body, skin, pose, or background in IMAGE 2; use it only as a reference for the garment's color, fabric, print, neckline, sleeves, lacing, buttons, trims, and silhouette.

Edit IMAGE 1 so the subject is wearing "${data.garmentName}" (${data.garmentCategory}${data.garmentSubcategory ? `, ${data.garmentSubcategory}` : ""}) on the ${region}. Copy the garment from IMAGE 2 faithfully. ${layering}

${data.isInfant ? KEEP_INFANT : KEEP}
${IDENTITY}
${SKIN_BLEND}

Modest, SFW, photorealistic, no collage artifacts. ${data.extraInstruction || ""}

Output: a single edited image of the same subject now wearing the new garment in the correct slot, with every other garment preserved.`;

    console.log("[applyGarment] slot=", slot);
    return withCredit(context.userId, () => openaiEdit(prompt, [data.baseImageUrl, data.garmentImageUrl]));
  });

export const restyleLook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { baseImageUrl: string; instruction: string }) =>
    z.object({ baseImageUrl: z.string().min(5), instruction: z.string().min(2).max(400) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const prompt = `Adjust the styling of the outfit in this image: ${data.instruction}.

Do not add or remove garments unless explicitly asked. ${KEEP}
${IDENTITY}
${SKIN_BLEND}`;
    return withCredit(context.userId, () => openaiEdit(prompt, [data.baseImageUrl]));
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
- name: short descriptive product name
- category: MUST be one of: ${ALLOWED_CATEGORIES.join(", ")}
- subcategory: a more specific type within the category
- brand: visible brand from logo/text, or ""
- color: single dominant color word
- material: primary fabric/material if visible, or ""
- gender: one of "Femme", "Masc", "Androgynous", "Unisex", "Kids", "Other"
- season: an array of one or more of "Spring", "Summer", "Fall", "Winter", "All-season"
- price: estimated retail price as a number in USD, or null if you cannot tell
- tags: 3-6 lowercase style tags
Use any user hints below as ground truth — do not contradict them; fill the rest from the image.
Hints prefixed "canonical_" come from the official product page/URL and are ABSOLUTE TRUTH.
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
        } catch { /* ignore */ }
      }

      return { info: result };
    } catch (e: any) {
      return { error: e?.message || "Fetch failed" };
    }
  });
