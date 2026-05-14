import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, ClosetItem, Model } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Undo2, RotateCcw, Save, Plus, Loader2, Check, X, Wand2, Shirt, Trash } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { applyGarment, restyleLook } from "@/lib/ai.functions";
import { uploadDataUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Studio · Virtual Lookbook" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ model: (s.model as string) || undefined }),
  component: StudioPage,
});

const STYLE_CHIPS = [
  "let the open shirt hang off the shoulders",
  "tuck the top into the waistband",
  "roll up the sleeves",
  "untie and loosen the laces",
  "pop the collar",
  "knot the hem at the waist",
  "drape the jacket over one shoulder",
];

const POSE_CHIPS = [
  "runway pose",
  "walking pose",
  "hands on hips",
  "editorial pose",
  "over-the-shoulder",
  "leaning pose",
  "sitting pose",
];

type Mode = "one" | "selected";

function StudioPage() {
  const { models, items, updateModelImage, undoModel, resetModel, saveLook, studioTray, addToTray, removeFromTray, clearTray } = useStudio();
  const search = useSearch({ from: "/_authenticated/studio" });
  const [pickedId, setPickedId] = useState<string | undefined>(search.model);
  const modelId = pickedId || search.model || models[0]?.id;
  const model = useMemo(() => models.find((m: Model) => m.id === modelId), [models, modelId]);

  const [busy, setBusy] = useState(false);
  const [styleInput, setStyleInput] = useState("");
  const [mode, setMode] = useState<Mode>("one");

  const trayItems = useMemo(
    () => studioTray.map((id) => items.find((i) => i.id === id)).filter(Boolean) as ClosetItem[],
    [studioTray, items],
  );

  if (!model) {
    return (
      <AppLayout>
        <div className="glass rounded-3xl p-12 text-center max-w-xl mx-auto mt-10">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
          <div className="font-display text-3xl">No model loaded</div>
          <p className="text-muted-foreground text-sm mt-2 mb-6">Generate a model to begin styling.</p>
          <Link to="/models"><Button className="rounded-full bg-glow text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Create your first model</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const applyOne = async (item: ClosetItem, baseUrl: string): Promise<string | null> => {
    const res: any = await applyGarment({ data: {
      baseImageUrl: baseUrl,
      garmentImageUrl: item.imageUrl,
      garmentName: item.name,
      garmentCategory: item.category,
      modelPrompt: model.prompt,
      modelPose: model.pose,
    }});
    if (res.error || !res.dataUrl) { toast.error(res.error || `Try-on failed: ${item.name}`, { duration: 6000 }); return null; }
    const url = await uploadDataUrl(res.dataUrl, "looks");
    await updateModelImage(model.id, url, item.id);
    return url;
  };

  const tryOn = async (item: ClosetItem) => {
    if (mode === "selected") {
      if (studioTray.includes(item.id)) removeFromTray(item.id);
      else addToTray(item.id);
      return;
    }
    setBusy(true);
    try {
      await applyOne(item, model.currentImageUrl);
      toast.success(`${item.name} on ✦`);
    } catch (e: any) { console.error(e); toast.error(e?.message || "Failed", { duration: 6000 }); }
    finally { setBusy(false); }
  };

  const styleMe = async () => {
    if (trayItems.length === 0) return;
    setBusy(true);
    let base = model.currentImageUrl;
    try {
      for (const it of trayItems) {
        toast.message(`Applying ${it.name}…`);
        const next = await applyOne(it, base);
        if (!next) break;
        base = next;
      }
      toast.success("Look styled ✦");
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const restyle = async (instruction: string) => {
    if (!instruction.trim()) return;
    setBusy(true);
    try {
      const res: any = await restyleLook({ data: { baseImageUrl: model.currentImageUrl, instruction } });
      if (res.error || !res.dataUrl) { toast.error(res.error || "Restyle failed", { duration: 6000 }); return; }
      const url = await uploadDataUrl(res.dataUrl, "looks");
      updateModelImage(model.id, url);
      toast.success("Restyled ✦");
      setStyleInput("");
    } catch (e: any) { console.error(e); toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const applyPose = (pose: string) =>
    restyle(`Change the model's pose to a ${pose}. Keep the outfit, framing, identity, lighting, and background unchanged.`);

  const save = () => {
    saveLook({ name: `${model.name} look`, modelId: model.id, imageUrl: model.currentImageUrl, itemIds: model.wornItemIds });
    toast.success("Saved to lookbook ✦");
  };

  return (
    <AppLayout>
      <header className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Styling studio</div>
          <h1 className="font-display text-3xl md:text-4xl mt-1">{model.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="glass rounded-full p-1 flex text-xs">
            <button onClick={() => setMode("one")} className={cn("px-3 py-1 rounded-full transition", mode === "one" && "bg-glow text-primary-foreground shadow-glow")}>One at a time</button>
            <button onClick={() => setMode("selected")} className={cn("px-3 py-1 rounded-full transition", mode === "selected" && "bg-glow text-primary-foreground shadow-glow")}>Selected items</button>
          </div>
          {models.length > 1 && (
            <select value={model.id} onChange={(e) => setPickedId(e.target.value)} className="glass rounded-full px-3 py-1.5 text-sm bg-background/60">
              {models.map((m: Model) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>
      </header>

      {/* Preview */}
      <div className="relative glass rounded-3xl overflow-hidden">
        <div className="aspect-[3/4] bg-dreamy">
          <img src={model.currentImageUrl} alt={model.name} className="h-full w-full object-cover" />
        </div>
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
              <div className="text-sm">AI is restyling…</div>
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy || model.history.length === 0} onClick={() => undoModel(model.id)}><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => { if (confirm("Reset to base (underwear only)?")) resetModel(model.id); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={save}><Save className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Active styling tray */}
      <section className="mt-5 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Active styling tray</h2>
            <span className="text-xs text-muted-foreground">({trayItems.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "selected" && (
              <Button size="sm" disabled={busy || trayItems.length === 0} onClick={styleMe} className="bg-glow text-primary-foreground shadow-glow">
                <Wand2 className="h-3.5 w-3.5 mr-1" /> Style Me
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy || trayItems.length === 0} onClick={clearTray}>
              <Trash className="h-3.5 w-3.5 mr-1" /> Hang up clothes
            </Button>
          </div>
        </div>
        {trayItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">Send items here from your closet to style in batches.</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {trayItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2 glass rounded-full pl-1 pr-2 py-1">
                <div className="h-7 w-7 rounded-full overflow-hidden bg-dreamy"><img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" /></div>
                <span className="text-xs">{it.name}</span>
                <button onClick={() => removeFromTray(it.id)} className="h-5 w-5 grid place-items-center rounded-full hover:bg-accent"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Closet strip */}
      <section className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg">Your closet</h2>
          <Link to="/closet" className="text-xs underline text-muted-foreground">Manage</Link>
        </div>
        {items.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Add clothing in your closet to dress this model. <Link to="/closet" className="underline">Open closet</Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {items.map((it: ClosetItem) => {
              const worn = model.wornItemIds.includes(it.id);
              const inTray = studioTray.includes(it.id);
              return (
                <button key={it.id} disabled={busy} onClick={() => tryOn(it)}
                  className={cn("group shrink-0 w-24 text-left rounded-xl glass overflow-hidden hover:shadow-glow transition", busy && "opacity-50", inTray && "ring-2 ring-primary")}>
                  <div className="aspect-square bg-dreamy relative">
                    <img src={it.imageUrl} className="h-full w-full object-cover" alt={it.name} />
                    {worn && <div className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-glow text-primary-foreground"><Check className="h-3 w-3" /></div>}
                    {inTray && !worn && <div className="absolute top-1 left-1 h-5 w-5 grid place-items-center rounded-full bg-primary text-primary-foreground text-[10px]">+</div>}
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-[11px] truncate font-medium">{it.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{it.category}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Pose tweaks */}
      <section className="mt-5 glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-display text-lg">Model pose</h2></div>
        <div className="flex flex-wrap gap-1.5">
          {POSE_CHIPS.map((p) => (
            <button key={p} disabled={busy} onClick={() => applyPose(p)} className="text-xs px-3 py-1.5 rounded-full glass hover:bg-accent disabled:opacity-50">{p}</button>
          ))}
        </div>
      </section>

      {/* AI styling prompt */}
      <section className="mt-5 glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-display text-lg">AI styling tweak</h2></div>
        <div className="flex gap-2">
          <Input value={styleInput} onChange={(e) => setStyleInput(e.target.value)} placeholder='"let the open shirt hang off the shoulders"'
            onKeyDown={(e) => { if (e.key === "Enter") restyle(styleInput); }} disabled={busy} />
          <Button onClick={() => restyle(styleInput)} disabled={busy || !styleInput.trim()} className="bg-glow text-primary-foreground shadow-glow">Apply</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {STYLE_CHIPS.map((c) => (
            <button key={c} onClick={() => setStyleInput(c)} className="text-[10px] px-2 py-1 rounded-full glass hover:bg-accent">{c}</button>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
