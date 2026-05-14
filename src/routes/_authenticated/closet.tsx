import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, DEFAULT_CATEGORIES, ClosetItem } from "@/lib/store";
import { useEffect, useMemo, useRef, useState, ChangeEvent, DragEvent } from "react";
import { Heart, Plus, Search, Trash2, Upload, Link as LinkIcon, X, Pencil, CheckSquare, Square, Wand2, Sparkles, FolderPlus, Shirt, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadFile, uploadDataUrl } from "@/lib/storage";
import { analyzeGarment, mirrorRemoteImage, fetchProductInfo } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/closet")({
  head: () => ({ meta: [{ title: "Closet · Virtual Lookbook" }] }),
  component: ClosetPage,
});

const GENDERS = ["Femme", "Masc", "Androgynous", "Unisex", "Kids", "Other"];
const SEASONS = ["Spring", "Summer", "Fall", "Winter", "All-season"];

type FormState = {
  name: string; category: string; subcategory: string; gender: string; season: string;
  price: string; brand: string; color: string; tags: string; source: string; notes: string;
  imageUrl: string; backUrl: string; customFields: { label: string; value: string }[];
};

const emptyForm = (): FormState => ({
  name: "", category: "Tops", subcategory: "", gender: "", season: "",
  price: "", brand: "", color: "", tags: "", source: "", notes: "",
  imageUrl: "", backUrl: "", customFields: [],
});

function ClosetPage() {
  const { items: allItems, addItem, updateItem, removeItem, customCategories, addCategory, subcategories, addSubcategory, addToTray,
    closets, activeClosetId, setActiveClosetId, addCloset, renameCloset, removeCloset } = useStudio();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("All");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ClosetItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newClosetOpen, setNewClosetOpen] = useState(false);
  const [newClosetName, setNewClosetName] = useState("");

  const items = useMemo(
    () => allItems.filter((it) => !activeClosetId || !it.closetId || it.closetId === activeClosetId),
    [allItems, activeClosetId]
  );
  const activeCloset = closets.find((c) => c.id === activeClosetId) || null;

  const allCats = useMemo(() => ["All", ...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);

  const filtered = items.filter((i) =>
    (filter === "All" || i.category === filter) &&
    (!favOnly || i.favorite) &&
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()) || i.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())))
  );

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const bulkSendToStudio = () => {
    if (selected.size === 0) return;
    addToTray(Array.from(selected));
    toast.success(`${selected.size} item(s) sent to Styling Studio ✦`);
    exitSelect();
    navigate({ to: "/studio" });
  };
  const bulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} item(s)?`)) return;
    for (const id of selected) await removeItem(id);
    toast.success("Deleted");
    exitSelect();
  };
  const bulkFav = async () => {
    for (const id of selected) {
      const it = items.find((x) => x.id === id);
      if (it) await updateItem(id, { favorite: !it.favorite });
    }
    exitSelect();
  };

  return (
    <AppLayout>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your wardrobe</div>
          <h1 className="font-display text-4xl md:text-5xl mt-1">Closet</h1>
          <p className="text-muted-foreground mt-1 text-sm">Keep separate closets for yourself, a partner, a child, or a friend.</p>
          <div className="mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2">
                  <Shirt className="h-4 w-4" />
                  <span className="font-medium">{activeCloset?.name || "No closet"}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch closet</DropdownMenuLabel>
                {closets.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => setActiveClosetId(c.id)} className="flex items-center gap-2">
                    <Shirt className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.id === activeClosetId && <Sparkles className="h-3 w-3 text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNewClosetOpen(true)}>
                  <FolderPlus className="h-3.5 w-3.5 mr-2" /> New closet…
                </DropdownMenuItem>
                {activeCloset && (
                  <DropdownMenuItem onClick={() => {
                    const n = window.prompt("Rename closet", activeCloset.name);
                    if (n && n.trim()) renameCloset(activeCloset.id, n.trim());
                  }}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Rename current
                  </DropdownMenuItem>
                )}
                {activeCloset && closets.length > 1 && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${activeCloset.name}" and all its items?`)) removeCloset(activeCloset.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete current
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={selectMode ? "default" : "outline"} className="rounded-full" onClick={() => { selectMode ? exitSelect() : setSelectMode(true); }}>
            {selectMode ? <><CheckSquare className="h-4 w-4 mr-1" /> Done</> : <><Square className="h-4 w-4 mr-1" /> Select</>}
          </Button>
          <Button onClick={() => setAdding(true)} className="rounded-full bg-glow text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
      </header>

      <Dialog open={newClosetOpen} onOpenChange={setNewClosetOpen}>
        <DialogContent className="max-w-sm glass">
          <DialogHeader><DialogTitle className="font-display text-2xl">New closet</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Give it a name — for example "Mia's wardrobe", "Travel capsule", or "Partner".</p>
          <Input autoFocus value={newClosetName} onChange={(e) => setNewClosetName(e.target.value)} placeholder="Closet name" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewClosetOpen(false)}>Cancel</Button>
            <Button
              className="bg-glow text-primary-foreground shadow-glow"
              onClick={async () => {
                const c = await addCloset(newClosetName || "New closet");
                if (c) { toast.success(`Created "${c.name}" ✦`); setNewClosetName(""); setNewClosetOpen(false); }
              }}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6 glass rounded-2xl p-3 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, tags…" className="pl-9 bg-background/60" />
        </div>
        <button onClick={() => setFavOnly((v) => !v)} className={cn("rounded-full px-4 py-2 text-sm border", favOnly ? "bg-glow text-primary-foreground shadow-glow border-transparent" : "glass")}>
          <Heart className={cn("inline h-3.5 w-3.5 mr-1.5", favOnly && "fill-current")} /> Favorites
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {allCats.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-xs whitespace-nowrap border transition",
              filter === c ? "bg-glow text-primary-foreground shadow-glow border-transparent" : "glass hover:bg-accent")}>
            {c}
          </button>
        ))}
      </div>

      {selectMode && (
        <div className="mt-3 glass rounded-2xl px-4 py-2 flex items-center gap-2 flex-wrap sticky top-2 z-20">
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={bulkFav} disabled={!selected.size}><Heart className="h-3.5 w-3.5 mr-1" /> Favorite</Button>
          <Button size="sm" variant="outline" onClick={bulkSendToStudio} disabled={!selected.size}><Wand2 className="h-3.5 w-3.5 mr-1" /> Send to Studio</Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={!selected.size}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-10 glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">Your closet is a blank canvas</div>
          <p className="text-muted-foreground text-sm mt-2">Upload an image or paste a product URL to begin.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((it) => (
            <ItemCard key={it.id} item={it}
              selectMode={selectMode}
              selected={selected.has(it.id)}
              onToggleSelect={() => toggle(it.id)}
              onEdit={() => setEditing(it)}
              onFav={() => updateItem(it.id, { favorite: !it.favorite })}
              onRemove={() => removeItem(it.id)}
              onSendToStudio={() => { addToTray(it.id); toast.success(`${it.name} sent to Studio ✦`); }}
            />
          ))}
        </div>
      )}

      <ItemDialog
        open={adding} onOpenChange={setAdding}
        mode="add"
        customCategories={customCategories}
        subcategories={subcategories}
        addCategory={addCategory}
        addSubcategory={addSubcategory}
        onSubmit={async (s) => {
          await addItem({
            name: s.name || "Untitled piece",
            category: s.category, imageUrl: s.imageUrl, backUrl: s.backUrl || undefined,
            brand: s.brand || undefined, color: s.color || undefined,
            tags: s.tags.split(",").map((t) => t.trim()).filter(Boolean),
            source: s.source || undefined, notes: s.notes || undefined,
            subcategory: s.subcategory || undefined,
            gender: s.gender || undefined,
            season: s.season || undefined,
            price: s.price ? Number(s.price) : undefined,
            customFields: Object.fromEntries(s.customFields.filter((f) => f.label.trim()).map((f) => [f.label.trim(), f.value])),
          });
          toast.success("Added to closet ✦");
        }}
      />

      <ItemDialog
        open={!!editing} onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        initial={editing || undefined}
        customCategories={customCategories}
        subcategories={subcategories}
        addCategory={addCategory}
        addSubcategory={addSubcategory}
        onSubmit={async (s) => {
          if (!editing) return;
          await updateItem(editing.id, {
            name: s.name, category: s.category,
            imageUrl: s.imageUrl, backUrl: s.backUrl || undefined,
            brand: s.brand || undefined, color: s.color || undefined,
            tags: s.tags.split(",").map((t) => t.trim()).filter(Boolean),
            source: s.source || undefined, notes: s.notes || undefined,
            subcategory: s.subcategory || undefined,
            gender: s.gender || undefined,
            season: s.season || undefined,
            price: s.price ? Number(s.price) : undefined,
            customFields: Object.fromEntries(s.customFields.filter((f) => f.label.trim()).map((f) => [f.label.trim(), f.value])),
          });
          toast.success("Updated ✦");
          setEditing(null);
        }}
      />
    </AppLayout>
  );
}

function ItemCard({ item, selectMode, selected, onToggleSelect, onEdit, onFav, onRemove, onSendToStudio }: {
  item: ClosetItem; selectMode: boolean; selected: boolean;
  onToggleSelect: () => void; onEdit: () => void; onFav: () => void; onRemove: () => void; onSendToStudio: () => void;
}) {
  return (
    <div className={cn("group relative glass rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all", selected && "ring-2 ring-primary")}>
      <div className="aspect-[3/4] bg-dreamy cursor-pointer" onClick={() => selectMode ? onToggleSelect() : undefined}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : null}
      </div>
      {selectMode && (
        <div className="absolute top-2 left-2 h-6 w-6 grid place-items-center rounded-md bg-background/90 border" onClick={onToggleSelect}>
          {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.category}{item.subcategory ? ` · ${item.subcategory}` : ""}{item.brand ? ` · ${item.brand}` : ""}
            </div>
          </div>
          <button onClick={onFav} aria-label="Favorite" className="shrink-0 h-8 w-8 grid place-items-center rounded-full glass">
            <Heart className={cn("h-3.5 w-3.5", item.favorite && "fill-current text-pink-500")} />
          </button>
        </div>
        {(item.gender || item.season || item.price != null) && (
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            {[item.gender, item.season, item.price != null ? `$${item.price}` : null].filter(Boolean).join(" · ")}
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.slice(0,3).map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t}</span>)}
          </div>
        )}
        <div className="mt-2 flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={onSendToStudio}>
            <Wand2 className="h-3 w-3 mr-1" /> Studio
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        </div>
      </div>
      {!selectMode && (
        <button onClick={onRemove} aria-label="Delete" className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </div>
  );
}

function ItemDialog({
  open, onOpenChange, mode, initial, customCategories, subcategories, addCategory, addSubcategory, onSubmit,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  mode: "add" | "edit";
  initial?: ClosetItem;
  customCategories: string[];
  subcategories: { id: string; category: string; name: string }[];
  addCategory: (c: string) => void;
  addSubcategory: (cat: string, name: string) => Promise<void>;
  onSubmit: (s: FormState) => Promise<void>;
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [s, setS] = useState<FormState>(emptyForm());
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setS({
        name: initial.name, category: initial.category,
        subcategory: initial.subcategory || "", gender: initial.gender || "",
        season: initial.season || "", price: initial.price != null ? String(initial.price) : "",
        brand: initial.brand || "", color: initial.color || "",
        tags: (initial.tags || []).join(", "),
        source: initial.source || "", notes: initial.notes || "",
        imageUrl: initial.imageUrl, backUrl: initial.backUrl || "",
        customFields: Object.entries(initial.customFields || {}).map(([label, value]) => ({ label, value: String(value) })),
      });
    } else if (mode === "add") {
      setS(emptyForm());
      setAiSuggested(false);
    }
  }, [open, mode, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }));

  const runAutoFill = async (url: string, opts?: { sourceUrl?: string; canonical?: Record<string, any> }) => {
    if (!url) return;
    setAnalyzing(true);
    try {
      // Send all current field values as hints so the AI augments rather than overrides.
      const hints: Record<string, string> = {};
      if (s.name) hints.name = s.name;
      if (s.category) hints.category = s.category;
      if (s.subcategory) hints.subcategory = s.subcategory;
      if (s.brand) hints.brand = s.brand;
      if (s.color) hints.color = s.color;
      if (s.gender) hints.gender = s.gender;
      if (s.season) hints.season = s.season;
      if (s.price) hints.price = s.price;
      if (s.tags) hints.tags = s.tags;
      if (s.notes) hints.notes = s.notes;
      if (s.source) hints.source = s.source;
      if (opts?.sourceUrl) hints.source_url_canonical = opts.sourceUrl;
      if (opts?.canonical) {
        for (const [k, v] of Object.entries(opts.canonical)) {
          if (v != null && v !== "") hints[`canonical_${k}`] = String(v);
        }
      }

      const res: any = await analyzeGarment({ data: { imageUrl: url, hints } });
      if (res?.error) { toast.error(res.error); return; }
      const canonical = opts?.canonical || {};
      setS((p) => ({
        ...p,
        name: canonical.name ? String(canonical.name) : (p.name || res.name || p.name),
        category: p.category && p.category !== "Tops" ? p.category : (res.category || p.category),
        subcategory: canonical.subcategory ? String(canonical.subcategory) : (p.subcategory || res.subcategory || p.subcategory),
        brand: canonical.brand ? String(canonical.brand) : (p.brand || res.brand || p.brand),
        color: canonical.color ? String(canonical.color) : (p.color || res.color || p.color),
        gender: p.gender || res.gender || p.gender,
        season: p.season || res.season || p.season,
        price: canonical.price != null ? String(canonical.price) : (p.price || (res.price != null ? String(res.price) : p.price)),
        tags: p.tags || (res.tags || []).join(", "),
      }));
      setAiSuggested(true);
    } catch (e: any) {
      console.error("autofill failed", e);
      toast.error(e?.message || "Autofill failed");
    } finally { setAnalyzing(false); }
  };

  const handleFile = async (file: File, target: "front" | "back") => {
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (8MB max)"); return; }
    try {
      toast.loading("Uploading…", { id: "up" });
      const url = await uploadFile(file, "closet");
      toast.success("Uploaded ✦", { id: "up" });
      if (target === "front") { set("imageUrl", url); runAutoFill(url); } else set("backUrl", url);
    } catch (e: any) { toast.error(e?.message || "Upload failed", { id: "up" }); }
  };

  const handleUrlImport = async (raw: string) => {
    if (!raw || !/^https?:\/\//.test(raw)) { set("imageUrl", raw); return; }
    set("source", raw);

    const isImageUrl = /\.(jpe?g|png|webp|gif|avif|heic|heif)(\?|#|$)/i.test(raw);

    // 1. Product page → scrape canonical metadata first; these win over AI vision.
    let pageInfo: Record<string, any> = {};
    if (!isImageUrl) {
      try {
        toast.loading("Reading product page…", { id: "imp" });
        const info: any = await fetchProductInfo({ data: { url: raw } });
        if (info?.info) {
          pageInfo = info.info;
          setS((p) => ({
            ...p,
            name:  pageInfo.name  ? String(pageInfo.name)  : p.name,
            brand: pageInfo.brand ? String(pageInfo.brand) : p.brand,
            color: pageInfo.color ? String(pageInfo.color) : p.color,
            price: pageInfo.price != null ? String(pageInfo.price) : p.price,
            subcategory: pageInfo.subcategory ? String(pageInfo.subcategory) : p.subcategory,
            notes: p.notes || (pageInfo.description ? String(pageInfo.description) : p.notes),
          }));
        }
      } catch (e) { console.warn("fetchProductInfo failed", e); }
    } else {
      set("imageUrl", raw);
    }

    // 2. Fetch image bytes (only if user pasted a direct image URL).
    if (!isImageUrl) {
      toast.success("Page info imported ✦ — also paste the image URL to fetch the photo", { id: "imp" });
      return;
    }
    try {
      toast.loading("Importing image…", { id: "imp" });
      const m: any = await mirrorRemoteImage({ data: { url: raw } });
      if (m?.error || !m?.dataUrl) { toast.error(m?.error || "Import failed", { id: "imp" }); return; }
      const stable = await uploadDataUrl(m.dataUrl, "closet");
      set("imageUrl", stable);
      toast.success("Imported ✦", { id: "imp" });
      // 3. AI fills only what URL didn't provide.
      runAutoFill(stable, { sourceUrl: raw, canonical: pageInfo });
    } catch (e: any) { toast.error(e?.message || "Import failed", { id: "imp" }); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f, "front"); };

  const subOptions = subcategories.filter((x) => x.category === s.category);

  const submit = async () => {
    if (!s.imageUrl) { toast.error("Add a front image first"); return; }
    setSaving(true);
    try { await onSubmit(s); onOpenChange(false); }
    catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl">{mode === "edit" ? "Edit item" : "Add to your closet"}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 overflow-y-auto flex-1">
          {mode === "add" && (
            <div className="flex gap-2 mb-2">
              <button onClick={() => setTab("upload")} className={cn("rounded-full px-4 py-1.5 text-xs", tab === "upload" ? "bg-glow text-primary-foreground" : "glass")}><Upload className="inline h-3 w-3 mr-1" /> Upload</button>
              <button onClick={() => setTab("url")} className={cn("rounded-full px-4 py-1.5 text-xs", tab === "url" ? "bg-glow text-primary-foreground" : "glass")}><LinkIcon className="inline h-3 w-3 mr-1" /> URL import</button>
            </div>
          )}

          {(analyzing || aiSuggested) && (
            <div className="glass rounded-xl px-3 py-2 mb-2 text-xs flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {analyzing ? "AI is reading the image…" : "AI suggested details ✦ — edit anything before saving"}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
                className="aspect-[3/4] rounded-2xl bg-dreamy border-2 border-dashed border-border grid place-items-center text-center p-4 cursor-pointer relative overflow-hidden"
                onClick={() => mode === "edit" ? fileRef.current?.click() : tab === "upload" && fileRef.current?.click()}>
                {s.imageUrl ? (
                  <>
                    <img src={s.imageUrl} className="absolute inset-0 h-full w-full object-cover" alt="preview" />
                    <button onClick={(e) => { e.stopPropagation(); set("imageUrl", ""); }} className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/80"><X className="h-4 w-4" /></button>
                  </>
                ) : tab === "upload" || mode === "edit" ? (
                  <div className="text-foreground/70">
                    <Upload className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Drop or click</div>
                    <div className="text-xs">PNG, JPG, WEBP</div>
                  </div>
                ) : (
                  <div className="w-full px-3" onClick={(e) => e.stopPropagation()}>
                    <Input placeholder="https://store.com/product.jpg" defaultValue="" onBlur={(e) => handleUrlImport(e.target.value)} className="bg-background/80" />
                    <div className="text-xs text-foreground/60 mt-2">Paste any product image URL, then tab out</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f, "front"); }} />
              </div>
              {s.imageUrl && (
                <Button variant="outline" size="sm" className="w-full" disabled={analyzing} onClick={() => runAutoFill(s.imageUrl)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> {analyzing ? "Reading…" : "Autofill more info"}
                </Button>
              )}
              <details className="glass rounded-xl px-3 py-2 text-sm">
                <summary className="cursor-pointer">+ Add back / detail view</summary>
                <div className="mt-2 space-y-2">
                  <Input placeholder="Back image URL" value={s.backUrl} onChange={(e) => set("backUrl", e.target.value)} />
                  <Button variant="outline" size="sm" onClick={() => {
                    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
                    inp.onchange = () => { const f = inp.files?.[0]; if (f) handleFile(f, "back"); };
                    inp.click();
                  }}>Upload back image</Button>
                  {s.backUrl && <img src={s.backUrl} className="h-24 rounded-lg object-cover" alt="back" />}
                </div>
              </details>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
                <Input value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="Lace corset top" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Category</label>
                <Select value={s.category} onValueChange={(v) => { set("category", v); set("subcategory", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {[...DEFAULT_CATEGORIES, ...customCategories].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="+ New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                  <Button variant="outline" size="icon" onClick={() => { if (newCat) { addCategory(newCat); set("category", newCat); setNewCat(""); } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Subcategory</label>
                {subOptions.length > 0 ? (
                  <Select value={s.subcategory || "__none__"} onValueChange={(v) => set("subcategory", v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {subOptions.map((sub) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={s.subcategory} onChange={(e) => set("subcategory", e.target.value)} placeholder="e.g. crop top" />
                )}
                <div className="flex gap-2 mt-2">
                  <Input placeholder="+ Add new subcategory" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
                  <Button variant="outline" size="icon" onClick={async () => {
                    if (!newSub.trim()) return;
                    await addSubcategory(s.category, newSub.trim());
                    set("subcategory", newSub.trim());
                    setNewSub("");
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Gender</label>
                  <Select value={s.gender || "__any__"} onValueChange={(v) => set("gender", v === "__any__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any</SelectItem>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Seasons</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {SEASONS.map((g) => {
                      const sel = new Set(s.season ? s.season.split(",").map((x) => x.trim()).filter(Boolean) : []);
                      const on = sel.has(g);
                      return (
                        <button
                          type="button"
                          key={g}
                          onClick={() => {
                            if (on) sel.delete(g); else sel.add(g);
                            set("season", Array.from(sel).join(", "));
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs border transition",
                            on ? "bg-glow text-primary-foreground shadow-glow border-transparent" : "glass hover:shadow-glow"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Price</label>
                  <Input type="number" inputMode="decimal" value={s.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
                </div>
                <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Brand</label><Input value={s.brand} onChange={(e) => set("brand", e.target.value)} /></div>
                <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Color</label><Input value={s.color} onChange={(e) => set("color", e.target.value)} placeholder="lavender" /></div>
              </div>
              <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Tags (comma)</label><Input value={s.tags} onChange={(e) => set("tags", e.target.value)} placeholder="goth, festival, lace" /></div>
              <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Source URL</label><Input value={s.source} onChange={(e) => set("source", e.target.value)} /></div>
              <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label><Textarea value={s.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Custom fields</label>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => set("customFields", [...s.customFields, { label: "", value: "" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add field
                  </Button>
                </div>
                <div className="space-y-2">
                  {s.customFields.map((f, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder="Label" value={f.label} onChange={(e) => {
                        const arr = [...s.customFields]; arr[idx] = { ...arr[idx], label: e.target.value }; set("customFields", arr);
                      }} className="w-1/3" />
                      <Input placeholder="Value" value={f.value} onChange={(e) => {
                        const arr = [...s.customFields]; arr[idx] = { ...arr[idx], value: e.target.value }; set("customFields", arr);
                      }} />
                      <Button variant="ghost" size="icon" onClick={() => set("customFields", s.customFields.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background/40 flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-glow text-primary-foreground shadow-glow">
            {saving ? "Saving…" : (mode === "edit" ? "Save changes" : "Save to closet")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
