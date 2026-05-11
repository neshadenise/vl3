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
  imageUrl: string; // front
  backUrl?: string;
  sideUrl?: string;
  detailUrl?: string;
  color?: string;
  brand?: string;
  tags: string[];
  notes?: string;
  source?: string;
  favorite?: boolean;
  createdAt: number;
};

export type ModelTemplate = {
  id: string;
  name: string;
  prompt: string;
  emoji: string;
};

export const MODEL_TEMPLATES: ModelTemplate[] = [
  { id: "f-curvy", name: "Femme · Curvy", prompt: "Femme model, curvy, soft styling", emoji: "✦" },
  { id: "m-athletic", name: "Masc · Athletic", prompt: "Masc model, athletic build", emoji: "✧" },
  { id: "andro", name: "Androgynous", prompt: "Androgynous model, neutral pose", emoji: "☾" },
  { id: "plus", name: "Plus-size", prompt: "Plus-size model, confident stance", emoji: "❀" },
  { id: "petite", name: "Petite", prompt: "Petite model, soft posture", emoji: "✿" },
  { id: "tall", name: "Tall", prompt: "Tall model, editorial pose", emoji: "❋" },
  { id: "wheel", name: "Wheelchair user", prompt: "Wheelchair user model, seated styled pose", emoji: "♿" },
  { id: "lp", name: "Little person", prompt: "Little person model, achondroplasia proportions, confident pose", emoji: "❖" },
  { id: "prosth", name: "Prosthetic limb", prompt: "Model with prosthetic limb, dynamic pose", emoji: "✺" },
  { id: "elder", name: "Elder", prompt: "Elder model, elegant stance", emoji: "❧" },
  { id: "teen", name: "Teen", prompt: "Teen model, casual pose", emoji: "✦" },
  { id: "muscle", name: "Muscular", prompt: "Muscular model, strong pose", emoji: "✦" },
];

export const POSES = [
  "Standing neutral","Fashion pose","Walking","Hands on hips","Editorial","Streetwear",
  "Athletic","Sitting","Wheelchair pose","Dynamic action","Side profile","Back-facing","3/4 pose"
];

export type StudioLayer = {
  id: string;
  itemId: string;
  x: number; y: number;
  scale: number; rotation: number;
  visible: boolean; locked: boolean;
};

export type Look = {
  id: string;
  name: string;
  modelId: string;
  pose: string;
  prompt: string;
  layers: StudioLayer[];
  itemIds: string[];
  thumbnail?: string; // dataURL of canvas snapshot (mock)
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

export type MoodboardPin = { id: string; type: "image" | "note" | "swatch"; url?: string; text?: string; color?: string; x: number; y: number; w: number; h: number; };
export type Moodboard = { id: string; name: string; pins: MoodboardPin[]; palette: string[]; createdAt: number; };

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
const KEY = "sds:v1";

function uid() { return Math.random().toString(36).slice(2, 10); }

function loadInitial() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("pastel");
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
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
      setLooks(data.looks || []);
      setCollections(data.collections || []);
      setMoodboards(data.moodboards || []);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ theme, items, customCategories, looks, collections, moodboards }));
  }, [hydrated, theme, items, customCategories, looks, collections, moodboards]);

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
  const removeItem: State["removeItem"] = (id) => setItems((p) => p.filter((x) => x.id !== id));

  const addCategory = (c: string) => setCustomCategories((p) => (p.includes(c) ? p : [...p, c]));

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
