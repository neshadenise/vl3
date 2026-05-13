import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "Collections · Virtual Lookbook" }] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { collections, addCollection, removeCollection, looks, addLookToCollection } = useStudio();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const presets = ["Vacation outfits","Wrestling gear","Gothic fashion","Concert outfits","Cosplay","Date night","Festival looks","Boutique planning"];

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Curated worlds</div>
          <h1 className="font-display text-4xl md:text-5xl">Collections</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-glow text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> New collection</Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader><DialogTitle className="font-display text-2xl">New collection</DialogTitle></DialogHeader>
            <Input placeholder="Vacation outfits" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((p) => <button key={p} onClick={() => setName(p)} className="text-xs rounded-full glass px-3 py-1">{p}</button>)}
            </div>
            <DialogFooter>
              <Button onClick={() => { if (name.trim()) { addCollection(name.trim()); setName(""); setOpen(false); } }}
                className="bg-glow text-primary-foreground shadow-glow">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {collections.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">No collections yet</div>
          <p className="text-muted-foreground text-sm mt-2">Create themed sets of looks.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => (
            <div key={c.id} className="glass rounded-3xl overflow-hidden">
              <div className="aspect-[16/9] bg-dreamy relative">
                <div className="absolute inset-0 stars opacity-40" />
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div className="font-display text-xl">{c.name}</div>
                  <button onClick={() => removeCollection(c.id)} className="h-7 w-7 grid place-items-center rounded-full bg-background/70"><Trash2 className="h-3 w-3 text-destructive" /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground">{c.lookIds.length} looks</div>
                {looks.length > 0 && (
                  <div className="mt-2">
                    <select onChange={(e) => { if (e.target.value) addLookToCollection(c.id, e.target.value); }} className="w-full bg-background/60 rounded-md text-xs p-2 border border-border" defaultValue="">
                      <option value="">+ Add a look…</option>
                      {looks.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
