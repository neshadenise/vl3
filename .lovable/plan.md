## Closet

**Schema migration** (`closet_items` table, additive — existing rows keep working):
- `subcategory` text
- `gender` text (Femme / Masc / Androgynous / Unisex / Kids / Other)
- `season` text (Spring / Summer / Fall / Winter / All-season)
- `price` numeric
- `custom_fields` jsonb (`{ [label: string]: string }`) — for user-defined fields
- New table `closet_subcategories` (per-user list of `{category, name}`) so "Add new subcategory" persists like custom categories do today.

**Add Item dialog**:
- Wrap dialog body in a scrollable container (`max-h-[85vh] overflow-y-auto`, sticky footer) — fixes mobile scroll where the bottom of the form is unreachable.
- New fields: Subcategory dropdown (filtered to current category) + "+ New subcategory" inline add; Gender select; Season select; Price input; Custom fields editor (label + value rows, "+ Add field" button).
- Keep existing "Autofill more info" flow (uses image + metadata via `analyzeGarment`).

**Closet grid**:
- Each card is editable in-place via a "Pencil" button that opens the same dialog pre-filled (`EditItemDialog` reusing `AddItemDialog` internals).
- **Bulk select**: a "Select" toggle puts cards into checkbox mode; bulk actions = Delete, Favorite, Send to Studio.

## Styling Studio

- **"Send to Styling Studio"** button on each closet card (and bulk action). Adds the item id(s) to a new `studioTray` (Zustand-style state on `useStudio`, persisted in localStorage so it survives nav/tweaks).
- **Persistent active tray** rendered above the closet strip in `studio.tsx`, showing chips for queued items with remove (×) buttons.
- **"Hang up clothes"** button clears `studioTray`.
- **Generation mode toggle** in studio header:
  - `One at a time` (current behavior — clicking a closet item triggers `applyGarment` immediately).
  - `Selected items` — clicking items just toggles them in the tray; a **Style Me** button appears that runs garments sequentially through `applyGarment`, chaining each result as the new base.
  - Style Me button is hidden in One-at-a-time mode.

## AI Styling Tweaks

- Restyle panel keeps clothing tweaks but adds a **Pose** section with quick-chip suggestions: runway, walking, hands on hips, editorial, over-the-shoulder, leaning, sitting.
- Tapping a pose chip calls `restyleLook` with `Change the model's pose to <pose>, keep outfit, framing, and identity unchanged.` Existing `restyleLook` server fn already handles this — no AI signature change.

## Homepage

- "Your muse" mockup card now shows the latest model image: pick the most recently updated model (max `created_at`, or `currentImageUrl` if it differs from `baseImageUrl`); fallback to `baseImageUrl`; final fallback to the existing dreamy gradient placeholder when the user has no models.

## Files

- `supabase/migrations/<new>.sql` — additive columns + new `closet_subcategories` table with RLS.
- `src/lib/store.tsx` — extend `ClosetItem` (subcategory, gender, season, price, customFields), wire mappers, add subcategories CRUD, add `studioTray` state + persistence + actions (`addToTray`, `removeFromTray`, `clearTray`).
- `src/routes/_authenticated/closet.tsx` — scrollable dialog, new fields, edit-in-place, bulk select, Send to Studio.
- `src/routes/_authenticated/studio.tsx` — tray UI, mode toggle, Style Me batch run, pose chips, Hang up clothes.
- `src/routes/index.tsx` — read latest model and render its image inside the muse mockup.

## Validation

- Migration applies cleanly; `select` from `closet_items` returns new columns nullable.
- Add Item dialog scrolls to footer on a 360px-wide viewport.
- Editing a card writes back via existing `updateItem`.
- Bulk delete / send to studio works on multi-select.
- Studio tray survives navigating Closet → Studio.
- Style Me runs N items in sequence with toasts and persistent tray.
- Pose chip applies via `restyleLook` and identity is preserved.
- Homepage shows latest model image; falls back gracefully.