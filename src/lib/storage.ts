import { supabase } from "@/integrations/supabase/client";

const BUCKET = "studio-images";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function userFolder(folder: string) {
  const { data } = await supabase.auth.getUser();
  const uidStr = data.user?.id;
  if (!uidStr) throw new Error("You must be signed in to upload.");
  return `${uidStr}/${folder}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("AI returned an invalid image. Please try again.");
  }
  const [meta, b64] = dataUrl.split(",");
  if (!b64) throw new Error("AI image was empty. Please try again.");
  const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function uploadDataUrl(dataUrl: string, folder: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.split("/")[1] || "png";
  const path = `${await userFolder(folder)}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${await userFolder(folder)}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
