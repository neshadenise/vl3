import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, Look } from "@/lib/store";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook · Virtual Lookbook" }] }),
  component: LookbookPage,
});

function LookbookPage() {
  const { looks, removeLook, models } = useStudio();
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {looks.map((l: Look) => {
            const model = models.find((m) => m.id === l.modelId);
            return (
              <div key={l.id} className="glass rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition group">
                <div className="aspect-[3/4] bg-dreamy">
                  <img src={l.imageUrl} className="w-full h-full object-cover" alt={l.name} />
                </div>
                <div className="p-3">
                  <div className="font-medium truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{model?.name || "—"} · {l.itemIds.length} items</div>
                  <div className="flex justify-between items-center mt-2">
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
