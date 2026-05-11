import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, MODEL_TEMPLATES } from "@/lib/store";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook · Style Doll Studio" }] }),
  component: LookbookPage,
});

function LookbookPage() {
  const { looks, removeLook, items } = useStudio();
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Saved looks</div>
          <h1 className="font-display text-4xl md:text-5xl">Lookbook</h1>
        </div>
        <Button asChild className="rounded-full bg-glow text-primary-foreground shadow-glow">
          <Link to="/studio"><Plus className="h-4 w-4 mr-1" /> New look</Link>
        </Button>
      </header>

      {looks.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">No looks yet</div>
          <p className="text-muted-foreground text-sm mt-2">Style something in the studio and save it here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {looks.map((l) => {
            const model = MODEL_TEMPLATES.find((m) => m.id === l.modelId);
            const previews = l.itemIds.slice(0, 4).map((id) => itemMap.get(id)?.imageUrl).filter(Boolean) as string[];
            return (
              <div key={l.id} className="glass rounded-3xl overflow-hidden shadow-soft hover:shadow-glow transition group">
                <div className="aspect-[4/5] bg-dreamy relative grid grid-cols-2 grid-rows-2 gap-1 p-2">
                  {previews.map((src, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-background/40">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                  {previews.length === 0 && <div className="col-span-2 row-span-2 grid place-items-center text-4xl">{model?.emoji}</div>}
                </div>
                <div className="p-4">
                  <div className="font-display text-lg truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{model?.name} · {l.pose}</div>
                  <p className="text-xs mt-2 line-clamp-2 text-foreground/80">{l.prompt}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => removeLook(l.id)} className="opacity-60 hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
