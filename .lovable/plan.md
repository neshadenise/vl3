# Plan: Tray-driven generation, credits, OpenAI gpt-image-1

## 1. Active Styling Tray UX (`studio.tsx`)

- Remove the **Style Me** button and `styleMe()` loop.
- Click tray item card/name → `applyOne(item, sessionImage)` for that one garment.
- X on a tray chip → return item to active closet (no generation).
- Keep tray scoped to `activeClosetId`.
- Keep "Hang up clothes" as the clear-all action.
- **Concurrency guard**: single `isGenerating` ref + state. While true:
  - Tray cards are disabled + show spinner; further clicks are ignored (not queued).
  - Show a small "Generating…" toast if a click is suppressed.
  - Lock releases in `finally`, even on error.

## 2. Garment layering logic (no replace-across-slots)

Define slot map keyed by category/subcategory:

```text
top      → tops, shirts, blouses, sweaters, tees, jackets, outerwear
bottom   → pants, jeans, skirts, shorts
dress    → dresses, jumpsuits, rompers (occupies top+bottom)
shoes    → shoes, boots, sneakers, sandals
hat      → hats, caps, beanies
accessory→ bags, jewelry, belts, scarves, sunglasses, ties
outer    → coats, blazers (layered over top)
```

Per-session `wornBySlot: Record<Slot, ItemId | null>` tracked in session state.

When user clicks a tray item:
1. Resolve `slot` from item's `category` / `subcategory`.
2. Conflict rules:
   - `dress` clears `top` + `bottom`.
   - `top` / `bottom` clear `dress`.
   - Otherwise replace only the same slot; **never** instruct the model to alter other slots.
3. Build edit prompt with explicit "Keep the existing {otherSlots} unchanged" guard, plus "Replace only the {slot}" instruction. Pass the new garment as a second image reference.
4. After success, update `wornBySlot[slot] = item.id` (clearing displaced slots).

This prevents "shoes wiping the dress" type artifacts even if the model is loose.

## 3. Per-session generation history (revert)

Session state in studio:
- `sessionImage: string` — current image
- `sessionHistory: Array<{ id, imageUrl, action, itemId?, slot?, wornSnapshot, createdAt }>`
- `historyIndex: number`

Behavior:
- Every successful generation pushes a new entry; truncates any "redo" tail if user reverts then edits.
- History strip in the studio UI: thumbnails with click-to-revert + a Restore button. Reverting resets `wornBySlot` from the snapshot too.
- History is **session-only** until the user saves a Look (then we persist the chosen frame). The bare model template is never overwritten — see §4.

## 4. Always preserve the bare model template

- `models.base_image_url` is **immutable** after creation — never written during a styling session.
- Studio reads `model.base_image_url` to seed `sessionImage` on a fresh open (or `look.image_url` when restyling a saved look).
- `model.current_image_url` already exists; we stop writing to it from studio. (Backfill not needed; we just leave it alone.) A follow-up cleanup can drop the column, but out of scope.
- "Reset to base" button in studio = `setSessionImage(model.base_image_url)` + clear history + clear wornBySlot.

## 5. Skin-tone blending at exposed edges

Append to every edit prompt:
> "Blend skin tones smoothly at all exposed garment edges (neckline, sleeves, hem, ankles, wrists). Match the person's existing skin tone, lighting, and shadows. Avoid hard seams, color banding, or mismatched undertones where skin meets fabric."

For infant/child prompts use the same guidance with age-appropriate phrasing.

No mask pipeline (gpt-image-1 handles holistic edits well); rely on the prompt + passing the current session image as the base so lighting/tone is anchored.

## 6. Credits + per-user privacy

New table `user_credits` (RLS owner-only):
- `user_id uuid PK`, `balance int default 25`, `generations_used int default 0`, `tier text default 'free'`, `updated_at timestamptz`.

Trigger extends `handle_new_user` to insert a row with 25 starting credits.

RLS audit: add missing UPDATE policy on `closet_subcategories`; re-verify `auth.uid() = user_id` on all user tables.

Server helpers in `src/lib/credits.server.ts`:
- `getBalance(supabase, userId)`
- `consumeCredit(supabase, userId, cost=1)` — atomic `UPDATE ... WHERE balance >= cost RETURNING *`; throws `INSUFFICIENT_CREDITS`.

All generation server fns:
1. `requireSupabaseAuth` → userId
2. Balance check (else return `{ error: "Out of credits" }` — no API call)
3. Call OpenAI
4. On success → `consumeCredit(userId, 1)` + `generations_used++`
5. On failure → no deduction

## 7. OpenAI gpt-image-1 server pipeline

Add secret `OPENAI_API_KEY` (will request via `add_secret`).

Rewrite `src/lib/ai.functions.ts`:

- `generateModel` → `POST /v1/images/generations` (`model: "gpt-image-1"`), prompt = persona + pose + child/infant safety + identity-anchor language. Returns b64 → data URL.
- `applyGarment` (try-on / replace) → `POST /v1/images/edits` multipart:
  - `image[]` = current session PNG (primary, identity anchor) + garment reference PNG
  - `prompt` = slot-aware instruction + identity preservation + skin-blend + "keep other garments unchanged" list
- `restyleLook` / `changePose` → `/v1/images/edits` on current session with text instruction (also includes identity + skin-blend lines).

Identity preservation prompt (shared constant):
> "Preserve exactly the person's face, identity, body proportions, skin tone, hair, and pose unless explicitly instructed otherwise. Photorealistic fashion-editorial photography, studio lighting, magazine-quality fabric rendering. Match the reference garment's color, pattern, fit, and texture precisely."

All return `{ dataUrl, error }`; client uploads to `studio-images` bucket as today.

`OPENAI_API_KEY` is read inside the handler, never at module scope.

## 8. Credits UI

- `CreditsPill` in `AppLayout` header: balance + tier badge, invalidated after each generation.
- Workspace card on `index.tsx`: balance, generations used, tier label.
- 402/insufficient errors surface as a toast with "Out of credits" CTA.

## 9. Feature coverage matrix

| Feature | Endpoint | Slot-aware | Identity prompt | Skin blend |
|---|---|---|---|---|
| Outfit / try-on | edits | yes | yes | yes |
| Clothing replacement | edits | yes | yes | yes |
| Restyling | edits | n/a | yes | yes |
| Pose change | edits | n/a | yes | yes |
| Tray regenerate | edits | yes | yes | yes |
| Model creation | generations | n/a | n/a | n/a |

## Technical notes

- gpt-image-1 edits accept multiple input images — use that for [base, garment_ref].
- Concurrency: a single `useRef<boolean>` + state flag; gate is checked at the top of `applyOne`.
- History snapshots store `wornBySlot` so revert restores layering state correctly.
- All server fns return plain DTOs (data URL string + error string).

## Out of scope

- Stripe billing (tier is a label).
- Storage quota enforcement.
- Mask-based inpainting (rely on prompt anchoring).
- Dropping `models.current_image_url` column.

## Assumed defaults (flag to change)

- 25 starting credits, 1 credit per generation, OpenAI only (no Lovable AI fallback).
