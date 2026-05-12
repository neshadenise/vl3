import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

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

export type ClosetItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  backUrl?: string;
  color?: string;
  brand?: string;
  tags: string[];
  notes?: string;
  source?: string;
  favorite?: boolean;
  createdAt: number;
};

export const POSE_PRESETS = [
  "Standing neutral",
  "Hands on hips, confident",
  "Walking toward camera",
  "Editorial 3/4 turn",
  "Side profile",
  "Sitting on stool",
  "Wheelchair, styled pose",
  "Dynamic action",
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

export type Model = {
  id: string;
  name: string;
  prompt: string;
  pose: string;
  baseImageUrl: string;        // underwear-only original
  currentImageUrl: string;     // latest edit
  history: string[];           // for undo (most recent last)
  wornItemIds: string[];
  createdAt: number;
};

export type Look = {
  id: string;
  name: string;
  modelId: string;
  imageUrl: string;
  itemIds: string[];
  notes?: string;
  createdAt: number;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  lookIds: string[];
  cover?: string;
  createdAt: number;
};

export type MoodboardPin = { id: string; type: "image" | "note" | "swatch"; url?: string; text?: string; color?: string; x: number; y: number; w: number; h: number };
export type Moodboard = { id: string; name: string; pins: MoodboardPin[]; palette: string[]; createdAt: number };

type Theme = "pastel" | "astro";

type State = {
  theme: Theme;
  setTheme: (t: Theme) => void;

  items: ClosetItem[];
  addItem: (i: Omit<ClosetItem, "id" | "createdAt">) => ClosetItem;
  updateItem: (id: string, patch: Partial<ClosetItem>) => void;
  removeItem: (id: string) => void;

  customCategories: string[];
  addCategory: (c: string) => void;

  models: Model[];
  addModel: (m: Omit<Model, "id" | "createdAt" | "history" | "wornItemIds" | "currentImageUrl"> & { currentImageUrl?: string }) => Model;
  updateModelImage: (id: string, newUrl: string, addedItemId?: string) => void;
  resetModel: (id: string) => void;
  undoModel: (id: string) => void;
  removeModel: (id: string) => void;
  renameModel: (id: string, name: string) => void;

  looks: Look[];
  saveLook: (l: Omit<Look, "id" | "createdAt">) => Look;
  removeLook: (id: string) => void;

  collections: Collection[];
  addCollection: (name: string, description?: string) => Collection;
  addLookToCollection: (cid: string, lid: string) => void;
  removeCollection: (id: string) => void;

  moodboards: Moodboard[];
  addMoodboard: (name: string) => Moodboard;
  updateMoodboard: (id: string, patch: Partial<Moodboard>) => void;
  removeMoodboard: (id: string) => void;
};

const Ctx = createContext<State | null>(null);
const KEY = "sds:v2";

function uid() { return Math.random().toString(36).slice(2, 10); }

function loadInitial() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("pastel");
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = loadInitial();
    if (data) {
      setThemeState(data.theme || "pastel");
      setItems(data.items || []);
      setCustomCategories(data.customCategories || []);
      setModels(data.models || []);
      setLooks(data.looks || []);
      setCollections(data.collections || []);
      setMoodboards(data.moodboards || []);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ theme, items, customCategories, models, looks, collections, moodboards }));
  }, [hydrated, theme, items, customCategories, models, looks, collections, moodboards]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "astro") root.classList.add("dark"); else root.classList.remove("dark");
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const addItem: State["addItem"] = (i) => {
    const item: ClosetItem = { ...i, id: uid(), createdAt: Date.now() };
    setItems((p) => [item, ...p]);
    return item;
  };
  const updateItem: State["updateItem"] = (id, patch) =>
    setItems((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeItem = (id: string) => setItems((p) => p.filter((x) => x.id !== id));
  const addCategory = (c: string) => setCustomCategories((p) => (p.includes(c) ? p : [...p, c]));

  const addModel: State["addModel"] = (m) => {
    const model: Model = {
      ...m,
      id: uid(),
      createdAt: Date.now(),
      currentImageUrl: m.currentImageUrl || m.baseImageUrl,
      history: [],
      wornItemIds: [],
    };
    setModels((p) => [model, ...p]);
    return model;
  };
  const updateModelImage: State["updateModelImage"] = (id, newUrl, addedItemId) =>
    setModels((p) => p.map((m) => m.id === id ? {
      ...m,
      history: [...m.history, m.currentImageUrl],
      currentImageUrl: newUrl,
      wornItemIds: addedItemId && !m.wornItemIds.includes(addedItemId) ? [...m.wornItemIds, addedItemId] : m.wornItemIds,
    } : m));
  const resetModel = (id: string) =>
    setModels((p) => p.map((m) => m.id === id ? { ...m, currentImageUrl: m.baseImageUrl, history: [], wornItemIds: [] } : m));
  const undoModel = (id: string) =>
    setModels((p) => p.map((m) => {
      if (m.id !== id || m.history.length === 0) return m;
      const prev = m.history[m.history.length - 1];
      return { ...m, currentImageUrl: prev, history: m.history.slice(0, -1) };
    }));
  const removeModel = (id: string) => setModels((p) => p.filter((m) => m.id !== id));
  const renameModel = (id: string, name: string) =>
    setModels((p) => p.map((m) => m.id === id ? { ...m, name } : m));

  const saveLook: State["saveLook"] = (l) => {
    const look: Look = { ...l, id: uid(), createdAt: Date.now() };
    setLooks((p) => [look, ...p]);
    return look;
  };
  const removeLook = (id: string) => setLooks((p) => p.filter((x) => x.id !== id));

  const addCollection: State["addCollection"] = (name, description) => {
    const c: Collection = { id: uid(), name, description, lookIds: [], createdAt: Date.now() };
    setCollections((p) => [c, ...p]);
    return c;
  };
  const addLookToCollection = (cid: string, lid: string) =>
    setCollections((p) => p.map((c) => (c.id === cid ? { ...c, lookIds: [...new Set([...c.lookIds, lid])] } : c)));
  const removeCollection = (id: string) => setCollections((p) => p.filter((c) => c.id !== id));

  const addMoodboard: State["addMoodboard"] = (name) => {
    const m: Moodboard = { id: uid(), name, pins: [], palette: [], createdAt: Date.now() };
    setMoodboards((p) => [m, ...p]);
    return m;
  };
  const updateMoodboard: State["updateMoodboard"] = (id, patch) =>
    setMoodboards((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMoodboard = (id: string) => setMoodboards((p) => p.filter((m) => m.id !== id));

  return (
    <Ctx.Provider value={{
      theme, setTheme,
      items, addItem, updateItem, removeItem,
      customCategories, addCategory,
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
