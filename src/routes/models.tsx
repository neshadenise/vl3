import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { MODEL_TEMPLATES } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/models")({
  head: () => ({ meta: [{ title: "Models · Style Doll Studio" }] }),
  component: ModelsPage,
});

function ModelsPage() {
  const [prompt, setPrompt] = useState("Pastel goth wheelchair user with silver hair, glossy lips");
  return (
    <AppLayout>
      <header className="mb-6">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your muse</div>
        <h1 className="font-display text-4xl md:text-5xl">Models</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">Inclusive by default. Pick a template or describe a custom model — disability, body type, age, and identity all welcome.</p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MODEL_TEMPLATES.map((m) => (
          <div key={m.id} className="group glass rounded-3xl p-5 flex flex-col hover:shadow-glow transition">
            <div className="aspect-[3/4] rounded-2xl bg-dreamy grid place-items-center text-6xl">{m.emoji}</div>
            <div className="mt-3 font-display text-lg">{m.name}</div>
            <p className="text-xs text-muted-foreground mt-1 flex-1">{m.prompt}</p>
            <Button asChild variant="outline" className="rounded-full mt-3">
              <a href="/studio">Use in studio</a>
            </Button>
          </div>
        ))}
      </section>

      <section className="mt-10 glass rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4" />
          <h2 className="font-display text-2xl">Custom model</h2>
        </div>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Describe your model: identity, body, skin, hair, mobility, vibe…" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["Tall dark skin masc, athletic","Little person femme, achondroplasia","Curvy plus model, 5'3","Elder model, silver bob","Androgynous, soft cyber"].map((s) => (
            <button key={s} onClick={() => setPrompt(s)} className="rounded-full glass px-3 py-1 hover:shadow-glow">{s}</button>
          ))}
        </div>
        <Button className="mt-4 rounded-full bg-glow text-primary-foreground shadow-glow" onClick={() => toast.success("Custom model queued (mock) ✦")}>
          <Sparkles className="h-4 w-4 mr-1" /> Generate model
        </Button>
        <p className="text-xs text-muted-foreground mt-3">AI generation will be wired up next — your prompt is saved with the look.</p>
      </section>
    </AppLayout>
  );
}
