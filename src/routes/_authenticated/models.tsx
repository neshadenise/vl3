import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, POSE_PRESETS, MODEL_PROMPT_PRESETS, Model } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, Trash2, Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateModel } from "@/lib/ai.functions";
import { uploadDataUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({ meta: [{ title: "Models · Virtual Lookbook" }] }),
  component: ModelsPage,
});

function ModelsPage() {
  const { models, removeModel, renameModel } = useStudio();
  const nav = useNavigate();

  return (
    <AppLayout>
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI fashion models</div>
          <h1 className="font-display text-4xl md:text-5xl mt-1">Models</h1>
          <p className="text-muted-foreground mt-1 text-sm">Generate photorealistic models from a prompt. They start in basic underwear, ready to dress.</p>
        </div>
        <CreateModelDialog />
      </header>

      {models.length === 0 ? (
        <div className="mt-10 glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">No models yet</div>
          <p className="text-muted-foreground text-sm mt-2">Generate your first AI model to start styling.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {models.map((m: Model) => (
            <div key={m.id} className="group glass rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all">
              <button onClick={() => nav({ to: "/studio", search: { model: m.id } as any })} className="block w-full text-left">
                <div className="aspect-[3/4] bg-dreamy">
                  <img src={m.currentImageUrl} alt={m.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.wornItemIds.length} item(s) styled</div>
                </div>
              </button>
              <div className="px-3 pb-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  const n = prompt("Rename model", m.name); if (n) renameModel(m.id, n);
                }}><Edit3 className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this model?")) removeModel(m.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function CreateModelDialog() {
  const { addModel } = useStudio();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pose, setPose] = useState(POSE_PRESETS[0]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!prompt.trim()) { toast.error("Describe your model first"); return; }
    setBusy(true);
    try {
      const res = await generateModel({ data: { prompt, pose } });
      if (res.error || !res.dataUrl) { toast.error(res.error || "Generation failed"); setBusy(false); return; }
      const url = await uploadDataUrl(res.dataUrl, "models");
      const model = await addModel({ name: name || "Untitled model", prompt, pose, baseImageUrl: url, currentImageUrl: url });
      if (!model) { toast.error("Could not save model"); setBusy(false); return; }
      toast.success("Model generated ✦");
      setOpen(false);
      setName(""); setPrompt("");
      nav({ to: "/studio", search: { model: model.id } as any });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-glow text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> New model</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg glass">
        <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><Sparkles className="h-5 w-5" /> Generate a model</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name (optional)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Luna" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Describe your model</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Tall androgynous person, soft freckles, natural curls, warm olive skin..." />
            <div className="mt-2 flex flex-wrap gap-1">
              {MODEL_PROMPT_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setPrompt(p)} className="text-[10px] px-2 py-1 rounded-full glass hover:bg-accent">{p.split(",")[0]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Pose</label>
            <Select value={pose} onValueChange={setPose}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{POSE_PRESETS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Models are generated in basic neutral underwear. As you add tops or bottoms in the studio, undergarments are removed automatically.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-glow text-primary-foreground shadow-glow">
            {busy ? "Generating…" : "Generate ✦"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
