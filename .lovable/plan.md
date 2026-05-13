## Goal
Make model generation and clothing try-on reliably return a usable image, and show clear errors when AI or upload fails.

## What I’ll change
1. **Fix image response parsing**
   - Update the AI response parser to read generated images from both supported response shapes:
     - `message.images[0].image_url.url`
     - `message.content[]` entries with `type: "image_url"`
   - This handles the common case where the AI returns an image, but the app incorrectly treats it as “no image.”

2. **Use the most reliable edit model first**
   - Use the editing-capable image model for direct try-on edits first, then fall back to the higher-quality generation model.
   - Keep the current regeneration fallback, but make it stricter about producing a dressed full-body catalog image.

3. **Normalize generated image uploads**
   - Make `uploadDataUrl` validate that the AI returned a real `data:image/...;base64,...` URL before uploading.
   - Surface a clear toast if the AI returns an unsupported URL or malformed image.

4. **Improve try-on failure visibility**
   - Keep concise server logs around the AI model used, response shape, and whether an image was found.
   - Keep user-facing errors simple, e.g. “AI did not return an image. Try a different item photo.”

## Files to update
- `src/lib/ai.functions.ts`
- `src/lib/storage.ts`
- Small UI copy/error handling adjustments in:
  - `src/routes/_authenticated/models.tsx`
  - `src/routes/_authenticated/studio.tsx`

## Validation
- Confirm the code path can handle both image response formats.
- Verify the app no longer fails just because the image is returned in `message.content` instead of `message.images`.
- Check logs/errors remain useful for any remaining AI safety/credit/rate-limit failures.