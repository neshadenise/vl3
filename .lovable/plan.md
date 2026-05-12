
# Plan: AI Model Generation & AI Try-On

Replace the drag-drop styling canvas with a fully AI-driven studio. Models are generated photorealistically from a prompt and "locked" — every clothing addition or styling tweak edits that same base image so the person stays identical.

## 1. Backend (Lovable Cloud + AI Gateway)

Enable Lovable Cloud (gives us `LOVABLE_API_KEY` for the AI Gateway, plus storage for generated images so we don't bloat localStorage with base64).

Create three server functions in `src/lib/ai.functions.ts` calling `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-2.5-flash-image` (Nano Banana):

- **`generateModel({ prompt, pose })`** — text-to-image. Wraps user prompt with a fixed system preamble enforcing: photorealistic editorial fashion photography, full body, neutral studio backdrop, **wearing simple neutral undergarments (bra + briefs / boxer briefs based on prompt)**, no nudity, consistent lighting. Returns a base64 PNG → uploaded to Cloud Storage `models/` bucket → returns public URL.
- **`applyGarment({ baseImageUrl, garmentImageUrl, garmentType, instruction })`** — multi-image edit. Sends base model + garment reference image with prompt: "Dress the person in this exact garment, preserving fabric/print/color/cut. Keep face, body, pose, lighting, and background identical." If `garmentType` is `top` or `dress`, append "remove the bra/undershirt." If `bottom` or `dress`, append "remove the briefs." Returns new image URL that becomes the new base.
- **`restyleLook({ baseImageUrl, instruction })`** — single-image edit for free-form prompts like "let the open shirt hang off the shoulders." Same identity-preservation guardrails.

All three handle 429/402 errors and return `{ url, error }`. Validate inputs with Zod.

## 2. Data model changes (`src/lib/store.tsx`)

Extend `Look` and add a new `Model` concept:

- `Model { id, name, prompt, baseImageUrl, currentImageUrl, history: string[], wornItemIds: string[], hasTop, hasBottom, createdAt }`
  - `baseImageUrl` = original underwear-only generation (never overwritten)
  - `currentImageUrl` = latest composite after edits
  - `history` = stack of URLs for undo
- Replace `Look.layers: StudioLayer[]` with `Look.modelId`, `Look.snapshots: string[]`.
- Remove `StudioLayer` type and all drag/drop state.
- Add `models`, `addModel`, `updateModel`, `removeModel`, `appendModelHistory` (for undo).

Keep closet, collections, moodboards untouched.

## 3. Closet upload fix

Current upload uses `FileReader` → data URL stored in localStorage. This silently fails on large images and bloats storage. Switch to:
- Upload file to Cloud Storage `closet/` bucket via signed URL
- Store the returned public URL in `ClosetItem.imageUrl`
- URL-import path stays the same (just store the pasted URL)
- Keep 8MB client-side cap, add toast on failure

## 4. Studio rewrite (`src/routes/studio.tsx`)

Remove the entire drag-and-drop canvas, layer panel, transform controls, and pose-overlay logic. New three-pane layout (stacks vertically on mobile — current viewport is 488px):

```text
┌─────────────────────────────────────────────┐
│  MODEL PREVIEW (large, centered)            │
│  - currentImageUrl                          │
│  - undo / reset-to-base / save-look buttons │
│  - "regenerating…" shimmer overlay          │
├─────────────────────────────────────────────┤
│  CLOSET STRIP                               │
│  - horizontal scroll of closet items        │
│  - tap an item → "Add to outfit" → AI edit  │
├─────────────────────────────────────────────┤
│  AI STYLING PROMPT                          │
│  - text input + Send                        │
│  - chip suggestions: "off shoulder",        │
│    "tuck in", "roll sleeves", "untie"       │
└─────────────────────────────────────────────┘
```

Empty state (no model yet): big "Generate a model" CTA opening a dialog with prompt textarea, pose select, and example prompt chips (e.g., "tall androgynous model, soft freckles, natural curls, neutral pose").

## 5. Models route (`src/routes/models.tsx`)

Becomes the model gallery + creation flow:
- Grid of saved models with their base image
- "New model" → prompt dialog → calls `generateModel` → saves to store → routes to `/studio?model=<id>`
- Tap a model → opens it in studio
- Delete / rename / duplicate actions

## 6. UX guardrails

- Disable closet "Add to outfit" + AI prompt while a request is in flight; show progress.
- On AI error, toast the message and leave `currentImageUrl` unchanged.
- Undo button pops one entry off `history`.
- "Reset to base" reverts to underwear-only `baseImageUrl` and clears `wornItemIds`.

## 7. Files touched

- New: `src/lib/ai.functions.ts`, `src/lib/storage.functions.ts`
- Heavy edit: `src/lib/store.tsx`, `src/routes/studio.tsx`, `src/routes/models.tsx`, `src/routes/closet.tsx`
- Light edit: `src/routes/lookbook.tsx` (render `snapshots[0]` instead of canvas thumb), `src/routes/index.tsx` (update CTAs/copy)
- Delete: drag/drop layer code, pose-overlay assets if any

## Out of scope (this round)

- Per-user accounts (still local-first, models stored in Cloud Storage but indexed in localStorage)
- Front/back garment toggling during try-on (we just send the front image)
- Video/animation
