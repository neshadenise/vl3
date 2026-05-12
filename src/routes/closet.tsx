import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, DEFAULT_CATEGORIES, ClosetItem } from "@/lib/store";
import { useMemo, useRef, useState, ChangeEvent, DragEvent } from "react";
import { Heart, Plus, Search, Trash2, Upload, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/closet")({
  head: () => ({ meta: [{ title: "Closet · Style Doll Studio" }] }),
  component: ClosetPage,
});

function ClosetPage() {
  const { items, addItem, updateItem, removeItem, customCategories, addCategory } = useStudio();
  const [filter, setFilter] = useState<string>("All");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const allCats = useMemo(() => ["All", ...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);

  const filtered = items.filter((i) =>
    (filter === "All" || i.category === filter) &&
    (!favOnly || i.favorite) &&
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()) || i.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())))
  );

  return (
    <AppLayout>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your wardrobe</div>
          <h1 className="font-display text-4xl md:text-5xl mt-1">Closet</h1>
          <p className="text-muted-foreground mt-1 text-sm">Upload, tag, and prep items for the studio.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AddItemDialog onAdd={addItem} customCategories={customCategories} addCategory={addCategory} />
        </div>
      </header>

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

      {filtered.length === 0 ? (
        <div className="mt-10 glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">Your closet is a blank canvas</div>
          <p className="text-muted-foreground text-sm mt-2">Upload an image or paste a product URL to begin.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((it) => (
            <ItemCard key={it.id} item={it}
              onFav={() => updateItem(it.id, { favorite: !it.favorite })}
              onRemove={() => removeItem(it.id)} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function ItemCard({ item, onFav, onRemove }: { item: ClosetItem; onFav: () => void; onRemove: () => void }) {
  return (
    <div className="group relative glass rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all">
      <div className="aspect-[3/4] bg-dreamy">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground truncate">{item.category}{item.brand ? ` · ${item.brand}` : ""}</div>
          </div>
          <button onClick={onFav} aria-label="Favorite" className="shrink-0 h-8 w-8 grid place-items-center rounded-full glass">
            <Heart className={cn("h-3.5 w-3.5", item.favorite && "fill-current text-pink-500")} />
          </button>
        </div>
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.slice(0,3).map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t}</span>)}
          </div>
        )}
      </div>
      <button onClick={onRemove} aria-label="Delete" className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </button>
    </div>
  );
}

function AddItemDialog({ onAdd, customCategories, addCategory }: {
  onAdd: (i: Omit<ClosetItem, "id" | "createdAt">) => ClosetItem;
  customCategories: string[];
  addCategory: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Tops");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [newCat, setNewCat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setImageUrl(""); setBackUrl(""); setName(""); setBrand(""); setColor(""); setTags(""); setSource(""); setNotes(""); setNewCat(""); };

  const handleFile = async (file: File, target: "front" | "back") => {
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (8MB max)"); return; }
    try {
      toast.loading("Uploading…", { id: "up" });
      const url = await uploadFile(file, "closet");
      toast.success("Uploaded ✦", { id: "up" });
      if (target === "front") setImageUrl(url); else setBackUrl(url);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed", { id: "up" });
    }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f, "front"); };

  const submit = () => {
    if (!imageUrl) { toast.error("Add a front image first"); return; }
    onAdd({
      name: name || "Untitled piece",
      category, imageUrl, backUrl: backUrl || undefined,
      brand: brand || undefined, color: color || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      source: source || undefined, notes: notes || undefined,
    });
    toast.success("Added to closet ✦");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-glow text-primary-foreground shadow-glow hover:shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl glass">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to your closet</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <button onClick={() => setTab("upload")} className={cn("rounded-full px-4 py-1.5 text-xs", tab === "upload" ? "bg-glow text-primary-foreground" : "glass")}><Upload className="inline h-3 w-3 mr-1" /> Upload</button>
          <button onClick={() => setTab("url")} className={cn("rounded-full px-4 py-1.5 text-xs", tab === "url" ? "bg-glow text-primary-foreground" : "glass")}><LinkIcon className="inline h-3 w-3 mr-1" /> URL import</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
              className="aspect-[3/4] rounded-2xl bg-dreamy border-2 border-dashed border-border grid place-items-center text-center p-4 cursor-pointer relative overflow-hidden"
              onClick={() => tab === "upload" && fileRef.current?.click()}>
              {imageUrl ? (
                <>
                  <img src={imageUrl} className="absolute inset-0 h-full w-full object-cover" alt="preview" />
                  <button onClick={(e) => { e.stopPropagation(); setImageUrl(""); }} className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/80"><X className="h-4 w-4" /></button>
                </>
              ) : tab === "upload" ? (
                <div className="text-ink/70">
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Drop or click</div>
                  <div className="text-xs">PNG, JPG, WEBP</div>
                </div>
              ) : (
                <div className="w-full px-3">
                  <Input placeholder="https://store.com/product.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-background/80" />
                  <div className="text-xs text-ink/60 mt-2">Paste any product image URL</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f, "front"); }} />
            </div>
            <details className="glass rounded-xl px-3 py-2 text-sm">
              <summary className="cursor-pointer">+ Add back / detail view</summary>
              <div className="mt-2 space-y-2">
                <Input placeholder="Back image URL" value={backUrl} onChange={(e) => setBackUrl(e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => {
                  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
                  inp.onchange = () => { const f = inp.files?.[0]; if (f) handleFile(f, "back"); };
                  inp.click();
                }}>Upload back image</Button>
                {backUrl && <img src={backUrl} className="h-24 rounded-lg object-cover" alt="back" />}
              </div>
            </details>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lace corset top" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {[...DEFAULT_CATEGORIES, ...customCategories].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2 mt-2">
                <Input placeholder="+ New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => { if (newCat) { addCategory(newCat); setCategory(newCat); setNewCat(""); } }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Brand</label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
              <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Color</label><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="lavender" /></div>
            </div>
            <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Tags (comma)</label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="goth, festival, lace" /></div>
            <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Source URL</label><Input value={source} onChange={(e) => setSource(e.target.value)} /></div>
            <div><label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-glow text-primary-foreground shadow-glow">Save to closet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
