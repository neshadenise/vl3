import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Category =
  | "Tops" | "Bottoms" | "Dresses" | "Jackets" | "Shoes" | "Swimwear" | "Lingerie"
  | "Bags" | "Jewelry" | "Hats" | "Belts" | "Gloves" | "Socks"
  | "Hair accessories" | "Tech accessories" | "Wrestling gear" | "Costumes" | "Props"
  | "Custom";

export const DEFAULT_CATEGORIES: Category[] = [
  "Tops","Bottoms","Dresses","Jackets","Shoes","Swimwear","Lingerie",
  "Bags","Jewelry","Hats","Belts","Gloves","Socks",
  "Hair accessories","Tech accessories","Wrestling gear","Costumes","Props"
];

export const POSE_PRESETS = [
  "Standing neutral","Hands on hips, confident","Walking toward camera",
  "Editorial 3/4 turn","Side profile","Sitting on stool","Wheelchair, styled pose","Dynamic action",
];
export const MODEL_PROMPT_PRESETS = [
  "Tall androgynous person, soft freckles, natural curls, warm olive skin",
  "Curvy femme model, deep brown skin, sleek dark bob, almond eyes",
  "Plus-size femme, soft round features, strawberry blonde waves, fair freckled skin",
  "Masc model, athletic build, light brown skin, short faded hair, beard stubble",
  "Wheelchair user, femme, long auburn hair, porcelain skin, gentle smile",
  "Petite east-asian femme, jet black bangs, dewy skin, neutral expression",
  "Elder model with silver pixie cut, warm beige skin, expressive eyes",
];

export type ClosetItem = {
  id: string; name: string; category: string; imageUrl: string; backUrl?: string;
  color?: string; brand?: string; tags: string[]; notes?: string; source?: string;
  favorite?: boolean; createdAt: number;
  subcategory?: string; gender?: string; season?: string; price?: number;
  customFields?: Record<string, string>;
};
export type Model = {
  id: string; name: string; prompt: string; pose: string;
  baseImageUrl: string; currentImageUrl: string; history: string[];
  wornItemIds: string[]; createdAt: number;
};
export type Look = { id: string; name: string; modelId: string; imageUrl: string; itemIds: string[]; notes?: string; createdAt: number };
export type Collection = { id: string; name: string; description?: string; lookIds: string[]; cover?: string; createdAt: number };
export type MoodboardPin = { id: string; type: "image" | "note" | "swatch"; url?: string; text?: string; color?: string; x: number; y: number; w: number; h: number };
export type Moodboard = { id: string; name: string; pins: MoodboardPin[]; palette: string[]; createdAt: number };

type Theme = "pastel" | "astro" | "nature";

type State = {
  user: User | null;
  loadingAuth: boolean;
  signOut: () => Promise<void>;

  theme: Theme;
  setTheme: (t: Theme) => void;

  items: ClosetItem[];
  addItem: (i: Omit<ClosetItem, "id" | "createdAt">) => Promise<ClosetItem | null>;
  updateItem: (id: string, patch: Partial<ClosetItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;

  customCategories: string[];
  addCategory: (c: string) => void;

  subcategories: { id: string; category: string; name: string }[];
  addSubcategory: (category: string, name: string) => Promise<void>;

  studioTray: string[];
  addToTray: (ids: string | string[]) => void;
  removeFromTray: (id: string) => void;
  clearTray: () => void;

  models: Model[];
  addModel: (m: Omit<Model, "id" | "createdAt" | "history" | "wornItemIds" | "currentImageUrl"> & { currentImageUrl?: string }) => Promise<Model | null>;
  updateModelImage: (id: string, newUrl: string, addedItemId?: string) => Promise<void>;
  resetModel: (id: string) => Promise<void>;
  undoModel: (id: string) => Promise<void>;
  removeModel: (id: string) => Promise<void>;
  renameModel: (id: string, name: string) => Promise<void>;

  looks: Look[];
  saveLook: (l: Omit<Look, "id" | "createdAt">) => Promise<Look | null>;
  removeLook: (id: string) => Promise<void>;

  collections: Collection[];
  addCollection: (name: string, description?: string) => Promise<Collection | null>;
  addLookToCollection: (cid: string, lid: string) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;

  moodboards: Moodboard[];
  addMoodboard: (name: string) => Promise<Moodboard | null>;
  updateMoodboard: (id: string, patch: Partial<Moodboard>) => Promise<void>;
  removeMoodboard: (id: string) => Promise<void>;
};

const Ctx = createContext<State | null>(null);
const LOCAL_KEY = "vlb:prefs";

// row mappers
const mapItem = (r: any): ClosetItem => ({
  id: r.id, name: r.name, category: r.category, imageUrl: r.image_url,
  backUrl: r.back_url ?? undefined, color: r.color ?? undefined, brand: r.brand ?? undefined,
  tags: r.tags || [], notes: r.notes ?? undefined, source: r.source ?? undefined,
  favorite: !!r.favorite, createdAt: new Date(r.created_at).getTime(),
  subcategory: r.subcategory ?? undefined,
  gender: r.gender ?? undefined,
  season: r.season ?? undefined,
  price: r.price != null ? Number(r.price) : undefined,
  customFields: (r.custom_fields && typeof r.custom_fields === "object") ? r.custom_fields : {},
});
const mapModel = (r: any): Model => ({
  id: r.id, name: r.name, prompt: r.prompt, pose: r.pose,
  baseImageUrl: r.base_image_url, currentImageUrl: r.current_image_url,
  history: Array.isArray(r.history) ? r.history : [],
  wornItemIds: Array.isArray(r.worn_item_ids) ? r.worn_item_ids : [],
  createdAt: new Date(r.created_at).getTime(),
});
const mapLook = (r: any): Look => ({
  id: r.id, name: r.name, modelId: r.model_id || "", imageUrl: r.image_url,
  itemIds: Array.isArray(r.item_ids) ? r.item_ids : [],
  notes: r.notes ?? undefined, createdAt: new Date(r.created_at).getTime(),
});
const mapCollection = (r: any): Collection => ({
  id: r.id, name: r.name, description: r.description ?? undefined,
  lookIds: Array.isArray(r.look_ids) ? r.look_ids : [],
  cover: r.cover ?? undefined, createdAt: new Date(r.created_at).getTime(),
});
const mapMoodboard = (r: any): Moodboard => ({
  id: r.id, name: r.name,
  pins: Array.isArray(r.pins) ? r.pins : [],
  palette: Array.isArray(r.palette) ? r.palette : [],
  createdAt: new Date(r.created_at).getTime(),
});

export function StudioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [theme, setThemeState] = useState<Theme>("pastel");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [studioTray, setStudioTray] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; category: string; name: string }[]>([]);

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);

  // local prefs (theme + custom categories) — not user data
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const p = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (p?.theme) setThemeState(p.theme);
      if (Array.isArray(p?.customCategories)) setCustomCategories(p.customCategories);
      if (Array.isArray(p?.studioTray)) setStudioTray(p.studioTray);
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ theme, customCategories, studioTray }));
  }, [theme, customCategories, studioTray]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const r = document.documentElement;
    r.classList.remove("dark", "nature");
    if (theme === "astro") r.classList.add("dark");
    else if (theme === "nature") r.classList.add("nature");
  }, [theme]);

  // Auth listener
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingAuth(false);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Hydrate per-user data
  useEffect(() => {
    if (!user) {
      setItems([]); setModels([]); setLooks([]); setCollections([]); setMoodboards([]);
      return;
    }
    (async () => {
      const [it, md, lk, co, mb] = await Promise.all([
        supabase.from("closet_items").select("*").order("created_at", { ascending: false }),
        supabase.from("models").select("*").order("created_at", { ascending: false }),
        supabase.from("looks").select("*").order("created_at", { ascending: false }),
        supabase.from("collections").select("*").order("created_at", { ascending: false }),
        supabase.from("moodboards").select("*").order("created_at", { ascending: false }),
      ]);
      if (it.data) setItems(it.data.map(mapItem));
      if (md.data) setModels(md.data.map(mapModel));
      if (lk.data) setLooks(lk.data.map(mapLook));
      if (co.data) setCollections(co.data.map(mapCollection));
      if (mb.data) setMoodboards(mb.data.map(mapMoodboard));
      const sc = await (supabase.from as any)("closet_subcategories").select("*").order("created_at", { ascending: true });
      if (sc.data) setSubcategories(sc.data.map((r: any) => ({ id: r.id, category: r.category, name: r.name })));
    })();
  }, [user?.id]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const addCategory = (c: string) => setCustomCategories((p) => (p.includes(c) ? p : [...p, c]));

  const addSubcategory: State["addSubcategory"] = async (category, name) => {
    const uid = requireUser();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (subcategories.some((s) => s.category === category && s.name.toLowerCase() === trimmed.toLowerCase())) return;
    const { data, error } = await (supabase.from as any)("closet_subcategories")
      .insert({ user_id: uid, category, name: trimmed }).select().single();
    if (error || !data) { console.error(error); return; }
    setSubcategories((p) => [...p, { id: data.id, category: data.category, name: data.name }]);
  };

  const addToTray = (ids: string | string[]) => {
    const arr = Array.isArray(ids) ? ids : [ids];
    setStudioTray((p) => Array.from(new Set([...p, ...arr])));
  };
  const removeFromTray = (id: string) => setStudioTray((p) => p.filter((x) => x !== id));
  const clearTray = () => setStudioTray([]);

  const requireUser = () => {
    if (!user) throw new Error("Sign in required");
    return user.id;
  };

  // Items
  const addItem: State["addItem"] = async (i) => {
    const uid = requireUser();
    const { data, error } = await supabase.from("closet_items").insert({
      user_id: uid, name: i.name, category: i.category, image_url: i.imageUrl,
      back_url: i.backUrl || null, color: i.color || null, brand: i.brand || null,
      tags: i.tags || [], notes: i.notes || null, source: i.source || null,
      favorite: !!i.favorite,
      subcategory: i.subcategory || null,
      gender: i.gender || null,
      season: i.season || null,
      price: typeof i.price === "number" ? i.price : null,
      custom_fields: i.customFields || {},
    }).select().single();
    if (error || !data) { console.error(error); return null; }
    const mapped = mapItem(data);
    setItems((p) => [mapped, ...p]);
    return mapped;
  };
  const updateItem: State["updateItem"] = async (id, patch) => {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
    if (patch.backUrl !== undefined) dbPatch.back_url = patch.backUrl;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.brand !== undefined) dbPatch.brand = patch.brand;
    if (patch.tags !== undefined) dbPatch.tags = patch.tags;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.source !== undefined) dbPatch.source = patch.source;
    if (patch.favorite !== undefined) dbPatch.favorite = patch.favorite;
    if (patch.subcategory !== undefined) dbPatch.subcategory = patch.subcategory || null;
    if (patch.gender !== undefined) dbPatch.gender = patch.gender || null;
    if (patch.season !== undefined) dbPatch.season = patch.season || null;
    if (patch.price !== undefined) dbPatch.price = (patch.price as any) === "" ? null : patch.price;
    if (patch.customFields !== undefined) dbPatch.custom_fields = patch.customFields || {};
    const { error } = await supabase.from("closet_items").update(dbPatch).eq("id", id);
    if (error) { console.error(error); return; }
    setItems((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const removeItem: State["removeItem"] = async (id) => {
    const { error } = await supabase.from("closet_items").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setItems((p) => p.filter((x) => x.id !== id));
  };

  // Models
  const addModel: State["addModel"] = async (m) => {
    const uid = requireUser();
    const current = m.currentImageUrl || m.baseImageUrl;
    const { data, error } = await supabase.from("models").insert({
      user_id: uid, name: m.name, prompt: m.prompt, pose: m.pose,
      base_image_url: m.baseImageUrl, current_image_url: current,
      history: [], worn_item_ids: [],
    }).select().single();
    if (error || !data) { console.error(error); return null; }
    const mapped = mapModel(data);
    setModels((p) => [mapped, ...p]);
    return mapped;
  };
  const updateModelImage: State["updateModelImage"] = async (id, newUrl, addedItemId) => {
    const m = models.find((x) => x.id === id);
    if (!m) return;
    const newHistory = [...m.history, m.currentImageUrl];
    const newWorn = addedItemId && !m.wornItemIds.includes(addedItemId) ? [...m.wornItemIds, addedItemId] : m.wornItemIds;
    const { error } = await supabase.from("models").update({
      current_image_url: newUrl, history: newHistory, worn_item_ids: newWorn,
    }).eq("id", id);
    if (error) { console.error(error); return; }
    setModels((p) => p.map((x) => x.id === id ? { ...x, currentImageUrl: newUrl, history: newHistory, wornItemIds: newWorn } : x));
  };
  const resetModel: State["resetModel"] = async (id) => {
    const m = models.find((x) => x.id === id);
    if (!m) return;
    const { error } = await supabase.from("models").update({
      current_image_url: m.baseImageUrl, history: [], worn_item_ids: [],
    }).eq("id", id);
    if (error) { console.error(error); return; }
    setModels((p) => p.map((x) => x.id === id ? { ...x, currentImageUrl: m.baseImageUrl, history: [], wornItemIds: [] } : x));
  };
  const undoModel: State["undoModel"] = async (id) => {
    const m = models.find((x) => x.id === id);
    if (!m || m.history.length === 0) return;
    const prev = m.history[m.history.length - 1];
    const newHistory = m.history.slice(0, -1);
    const { error } = await supabase.from("models").update({
      current_image_url: prev, history: newHistory,
    }).eq("id", id);
    if (error) { console.error(error); return; }
    setModels((p) => p.map((x) => x.id === id ? { ...x, currentImageUrl: prev, history: newHistory } : x));
  };
  const removeModel: State["removeModel"] = async (id) => {
    const { error } = await supabase.from("models").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setModels((p) => p.filter((x) => x.id !== id));
  };
  const renameModel: State["renameModel"] = async (id, name) => {
    const { error } = await supabase.from("models").update({ name }).eq("id", id);
    if (error) { console.error(error); return; }
    setModels((p) => p.map((x) => x.id === id ? { ...x, name } : x));
  };

  // Looks
  const saveLook: State["saveLook"] = async (l) => {
    const uid = requireUser();
    const { data, error } = await supabase.from("looks").insert({
      user_id: uid, name: l.name, model_id: l.modelId || null,
      image_url: l.imageUrl, item_ids: l.itemIds || [], notes: l.notes || null,
    }).select().single();
    if (error || !data) { console.error(error); return null; }
    const mapped = mapLook(data);
    setLooks((p) => [mapped, ...p]);
    return mapped;
  };
  const removeLook: State["removeLook"] = async (id) => {
    const { error } = await supabase.from("looks").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setLooks((p) => p.filter((x) => x.id !== id));
  };

  // Collections
  const addCollection: State["addCollection"] = async (name, description) => {
    const uid = requireUser();
    const { data, error } = await supabase.from("collections").insert({
      user_id: uid, name, description: description || null, look_ids: [],
    }).select().single();
    if (error || !data) { console.error(error); return null; }
    const mapped = mapCollection(data);
    setCollections((p) => [mapped, ...p]);
    return mapped;
  };
  const addLookToCollection: State["addLookToCollection"] = async (cid, lid) => {
    const c = collections.find((x) => x.id === cid);
    if (!c) return;
    const newLooks = [...new Set([...c.lookIds, lid])];
    const { error } = await supabase.from("collections").update({ look_ids: newLooks }).eq("id", cid);
    if (error) { console.error(error); return; }
    setCollections((p) => p.map((x) => x.id === cid ? { ...x, lookIds: newLooks } : x));
  };
  const removeCollection: State["removeCollection"] = async (id) => {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setCollections((p) => p.filter((x) => x.id !== id));
  };

  // Moodboards
  const addMoodboard: State["addMoodboard"] = async (name) => {
    const uid = requireUser();
    const { data, error } = await supabase.from("moodboards").insert({
      user_id: uid, name, pins: [], palette: [],
    }).select().single();
    if (error || !data) { console.error(error); return null; }
    const mapped = mapMoodboard(data);
    setMoodboards((p) => [mapped, ...p]);
    return mapped;
  };
  const updateMoodboard: State["updateMoodboard"] = async (id, patch) => {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.pins !== undefined) dbPatch.pins = patch.pins;
    if (patch.palette !== undefined) dbPatch.palette = patch.palette;
    const { error } = await supabase.from("moodboards").update(dbPatch).eq("id", id);
    if (error) { console.error(error); return; }
    setMoodboards((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  };
  const removeMoodboard: State["removeMoodboard"] = async (id) => {
    const { error } = await supabase.from("moodboards").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setMoodboards((p) => p.filter((x) => x.id !== id));
  };

  return (
    <Ctx.Provider value={{
      user, loadingAuth, signOut,
      theme, setTheme,
      items, addItem, updateItem, removeItem,
      customCategories, addCategory,
      subcategories, addSubcategory,
      studioTray, addToTray, removeFromTray, clearTray,
      models, addModel, updateModelImage, resetModel, undoModel, removeModel, renameModel,
      looks, saveLook, removeLook,
      collections, addCollection, addLookToCollection, removeCollection,
      moodboards, addMoodboard, updateMoodboard, removeMoodboard,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStudio must be used within StudioProvider");
  return c;
}