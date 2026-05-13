## 1. Rename to "Virtual Lookbook"

Replace "Style Doll Studio" everywhere — sidebar/header brand, mobile top bar, all route `head().meta.title` (Dashboard, Closet, Studio, Models, Lookbook, Collections, Moodboards, Settings), the dashboard hero copy, and `index.html` `<title>`. Also update `.lovable/project.json` name if present. The Lookbook page header keeps "Lookbook" as the section title.

## 2. Dark-mode font contrast fix

Two offenders:
- Dashboard hero (`src/routes/index.tsx`) uses `text-ink` on a `bg-dreamy` panel — `--ink` is near-black in BOTH themes, so in dark mode dark text sits on a darkened gradient. Switch to `text-foreground` and let dark theme invert.
- Sidebar Tip card (`src/components/AppLayout.tsx`) uses `bg-dreamy text-ink` — same problem. Switch to `text-foreground` (or wrap in a not-dark-aware variant).

Sweep for any other `text-ink` / `text-ink/70` usages and replace with `text-foreground` / `text-foreground/70` so dark mode stays legible. Keep `--ink` token (used for branding gradients).

## 3. Try-on bug — clicking a closet item doesn't dress the model

Root cause is most likely a broken AI request payload: the model image and garment image are passed as raw URLs, but Gemini image edit through the Lovable gateway expects each image as an `image_url` with a fully-qualified, fetchable URL. Items added BEFORE the Supabase bucket existed (or pasted as relative paths) end up as data-URLs / blob URLs that Gemini cannot fetch, so the call returns "no image" and the toast is silently swallowed.

Fix:
- In `studio.tsx` `tryOn`, surface the actual error string from `applyGarment` (currently shown but easy to miss) and add a `console.error` with the full response for debugging.
- In `applyGarment` handler, validate that both URLs are `https://` — if a `data:` URL is passed for `garmentImageUrl`, accept it but inline as `image_url` (Gemini accepts data URLs); reject `blob:` with a clear error.
- Ensure URL-imported closet items (where the user pastes a remote URL) are re-uploaded to the `studio-images` bucket on save so we always own a stable `https://` URL. Add a tiny server fn `mirrorRemoteImage` that fetches the remote URL and stores it via `supabaseAdmin` storage; call it from `closet.tsx` submit if `imageUrl` is not already on our bucket.
- Add a top-level `try/catch` log in the studio's `tryOn` so failures appear in the console with the request/response shape.

## 4. Full head-to-toe model base

Strengthen `BASE_PROMPT` in `src/lib/ai.functions.ts`:
- Explicitly require "FULL BODY from the top of the head to the soles of the feet, both feet visible inside the frame, generous headroom and footroom, vertical 3:4 portrait orientation, model occupies ~80% of frame height, NO cropping of head, hands, or feet."
- Add the same framing reminder to `KEEP` so try-on edits don't recompose tighter crops.
- Add a fallback safeguard: if generated image aspect ratio is wider than 4:5, log a warning (we can't easily re-roll, but the prompt change is the main lever).

## 5. AI auto-fill on closet upload

Add a new server fn `analyzeGarment` in `ai.functions.ts` using `google/gemini-2.5-flash` (text model, vision capable) that takes an image URL and returns `{ name, category, brand, color, tags[] }` via JSON-mode prompt constrained to the existing `DEFAULT_CATEGORIES` enum.

In `closet.tsx` `AddItemDialog`:
- Right after `handleFile` finishes uploading the front image (or after a remote URL is pasted), trigger `analyzeGarment` with a small "Analyzing…" toast.
- On success, populate `name`, `category`, `brand`, `color`, `tags` ONLY if they're still empty (don't overwrite user edits).
- Show a tiny "AI suggested ✦ — edit anything before saving" banner at the top of the form.
- Keep the Save button enabled the whole time; analysis is best-effort, never blocking.

## Technical notes

- All AI calls already go through Lovable AI Gateway with `LOVABLE_API_KEY`; no new secrets needed.
- `analyzeGarment` uses `response_format: { type: "json_object" }` and a system prompt listing valid categories so we don't get free-form output.
- No DB schema changes; everything fits the existing `ClosetItem` shape.

## Files touched

- `src/lib/ai.functions.ts` — strengthen base prompt, add `analyzeGarment`, add `mirrorRemoteImage` (or put in `storage.ts` server side).
- `src/routes/index.tsx` — copy + `text-ink` → `text-foreground`.
- `src/components/AppLayout.tsx` — Tip card contrast + brand rename.
- `src/routes/closet.tsx` — auto-fill flow + remote URL mirroring.
- `src/routes/studio.tsx` — better error logging on try-on.
- `src/routes/{lookbook,studio,models,closet,collections,moodboards,settings}.tsx` — meta titles.
- `index.html` — `<title>`.

## Out of scope

- Account/auth flow.
- Pose/body re-framing of existing already-generated models (only new generations get the head-to-toe prompt).
- Batch re-analysis of items already in the closet.
