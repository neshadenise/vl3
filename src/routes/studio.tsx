import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, MODEL_TEMPLATES, POSES, StudioLayer } from "@/lib/store";
import { useMemo, useRef, useState, PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Lock, Unlock, Trash2, Sparkles, Save, RotateCw, Wand2, GripVertical, Plus, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Styling Studio · Style Doll Studio" }] }),
  component: StudioPage,
});

function uid() { return Math.random().toString(36).slice(2, 10); }

function StudioPage() {
  const { items, saveLook } = useStudio();
  const [modelId, setModelId] = useState(MODEL_TEMPLATES[0].id);
  const [pose, setPose] = useState(POSES[0]);
  const [prompt, setPrompt] = useState("Pastel goth festival look, soft glow, ethereal");
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [angle, setAngle] = useState<"front" | "back" | "side" | "3/4">("front");
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const model = MODEL_TEMPLATES.find((m) => m.id === modelId)!;
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const addLayer = (itemId: string) => {
    const id = uid();
    setLayers((p) => [...p, { id, itemId, x: 50, y: 30 + p.length * 8, scale: 1, rotation: 0, visible: true, locked: false }]);
    setSelected(id);
  };

  const updateLayer = (id: string, patch: Partial<StudioLayer>) =>
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLayer = (id: string) => { setLayers((p) => p.filter((l) => l.id !== id)); if (selected === id) setSelected(null); };
  const duplicateLayer = (id: string) => {
    const l = layers.find((x) => x.id === id); if (!l) return;
    setLayers((p) => [...p, { ...l, id: uid(), x: l.x + 5, y: l.y + 5 }]);
  };
  const moveLayer = (id: string, dir: -1 | 1) => {
    setLayers((p) => {
      const i = p.findIndex((l) => l.id === id); if (i < 0) return p;
      const j = i + dir; if (j < 0 || j >= p.length) return p;
      const c = [...p]; [c[i], c[j]] = [c[j], c[i]]; return c;
    });
  };

  const handleDrag = (id: string) => (e: PointerEvent<HTMLDivElement>) => {
    const layer = layers.find((l) => l.id === id); if (!layer || layer.locked) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const ox = layer.x, oy = layer.y;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent<HTMLDivElement> | any) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      updateLayer(id, { x: Math.max(0, Math.min(100, ox + dx)), y: Math.max(0, Math.min(100, oy + dy)) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const generateLook = () => {
    if (layers.length === 0) { toast.error("Add at least one item"); return; }
    setGenerating(true);
    setTimeout(() => { setGenerating(false); toast.success("Look generated ✦"); }, 1100);
  };

  const onSave = () => {
    if (layers.length === 0) { toast.error("Add layers first"); return; }
    saveLook({
      name: `Look ${new Date().toLocaleString()}`,
      modelId, pose, prompt, layers,
      itemIds: layers.map((l) => l.itemId),
    });
    toast.success("Saved to lookbook ❤");
  };

  const sel = layers.find((l) => l.id === selected);

  return (
    <AppLayout>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Atelier</div>
          <h1 className="font-display text-4xl">Styling Studio</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-full" onClick={generateLook} disabled={generating}>
            {generating ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Generate Look
          </Button>
          <Button onClick={onSave} className="rounded-full bg-glow text-primary-foreground shadow-glow">
            <Save className="h-4 w-4 mr-1" /> Save Look
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr_280px] gap-4">
        {/* Closet panel */}
        <aside className="glass rounded-2xl p-3 max-h-[80vh] overflow-y-auto scrollbar-thin order-2 lg:order-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">Closet</div>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">No items yet. Add some in Closet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {items.map((it) => (
                <button key={it.id} onClick={() => addLayer(it.id)}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-dreamy hover:shadow-glow transition">
                  <img src={it.imageUrl} alt={it.name} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                    <span className="text-[10px] text-white">+ Add to model</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Canvas */}
        <section className="order-1 lg:order-2">
          <div className="glass rounded-3xl p-3 mb-2 flex flex-wrap gap-2 items-center text-sm">
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger className="w-[180px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{MODEL_TEMPLATES.map((m) => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={pose} onValueChange={setPose}>
              <SelectTrigger className="w-[160px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{POSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex glass rounded-full p-1 ml-auto">
              {(["front","3/4","side","back"] as const).map((a) => (
                <button key={a} onClick={() => setAngle(a)} className={cn("px-3 py-1 text-xs rounded-full", angle === a && "bg-glow text-primary-foreground")}>{a}</button>
              ))}
            </div>
          </div>

          <div ref={canvasRef}
            className="relative aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden bg-dreamy shadow-ring-soft">
            <div className="absolute inset-0 stars opacity-50" />
            {/* Stylized doll silhouette */}
            <DollSilhouette angle={angle} pose={pose} />

            {layers.map((l) => {
              const it = itemMap.get(l.itemId); if (!it || !l.visible) return null;
              const img = angle === "back" && it.backUrl ? it.backUrl : it.imageUrl;
              const isSel = selected === l.id;
              return (
                <div key={l.id}
                  onPointerDown={handleDrag(l.id)}
                  onClick={(e) => { e.stopPropagation(); setSelected(l.id); }}
                  className={cn("absolute touch-none cursor-grab active:cursor-grabbing select-none", isSel && "outline outline-2 outline-offset-2 outline-[oklch(0.78_0.14_305)] rounded-lg")}
                  style={{
                    left: `${l.x}%`, top: `${l.y}%`,
                    width: `${22 * l.scale}%`,
                    transform: `translate(-50%,-50%) rotate(${l.rotation}deg)`,
                  }}>
                  <img src={img} alt="" draggable={false} className="w-full h-auto pointer-events-none drop-shadow-2xl" />
                </div>
              );
            })}
            {generating && (
              <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur">
                <div className="glass rounded-2xl px-5 py-3 flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 animate-pulse" /> Conjuring your look…</div>
              </div>
            )}
          </div>

          <div className="mt-3 glass rounded-2xl p-3">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Styling prompt</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="mt-1" />
            <div className="text-[11px] text-muted-foreground mt-1">Try: “Layer bikini straps above shorts”, “luxury wrestling gear”, “cyber fairy streetwear”.</div>
          </div>
        </section>

        {/* Layers + properties */}
        <aside className="order-3 space-y-3">
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Layers</span>
              <span className="text-xs text-muted-foreground">{layers.length}</span>
            </div>
            {layers.length === 0 && <div className="text-sm text-muted-foreground p-3 text-center">Tap closet items to layer</div>}
            <ul className="space-y-1">
              {[...layers].reverse().map((l) => {
                const it = itemMap.get(l.itemId); if (!it) return null;
                const isSel = selected === l.id;
                return (
                  <li key={l.id} onClick={() => setSelected(l.id)}
                    className={cn("flex items-center gap-2 rounded-xl p-2 text-sm cursor-pointer", isSel ? "bg-accent" : "hover:bg-accent/50")}>
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <img src={it.imageUrl} className="h-8 w-8 rounded object-cover" alt="" />
                    <span className="flex-1 truncate">{it.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="opacity-60 hover:opacity-100"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="opacity-60 hover:opacity-100"><ChevronDown className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }); }}>{l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-50" />}</button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { locked: !l.locked }); }}>{l.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-50" />}</button>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </li>
                );
              })}
            </ul>
          </div>

          {sel && (
            <div className="glass rounded-2xl p-3 space-y-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Selected</div>
              <div>
                <div className="flex justify-between text-xs"><span>Scale</span><span>{sel.scale.toFixed(2)}</span></div>
                <Slider min={0.2} max={3} step={0.05} value={[sel.scale]} onValueChange={(v) => updateLayer(sel.id, { scale: v[0] })} />
              </div>
              <div>
                <div className="flex justify-between text-xs"><span>Rotation</span><span>{Math.round(sel.rotation)}°</span></div>
                <Slider min={-180} max={180} step={1} value={[sel.rotation]} onValueChange={(v) => updateLayer(sel.id, { rotation: v[0] })} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => duplicateLayer(sel.id)}><Plus className="h-3 w-3 mr-1" /> Duplicate</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => updateLayer(sel.id, { rotation: 0, scale: 1 })}><RotateCw className="h-3 w-3 mr-1" /> Reset</Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}

function DollSilhouette({ angle, pose }: { angle: string; pose: string }) {
  const wheel = pose.toLowerCase().includes("wheel");
  return (
    <svg viewBox="0 0 200 280" className="absolute inset-0 m-auto h-[88%] w-auto" aria-hidden>
      <defs>
        <linearGradient id="skin" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.85 0.05 50)" />
          <stop offset="1" stopColor="oklch(0.7 0.07 40)" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="0%" r="80%">
          <stop offset="0" stopColor="oklch(0.95 0.1 305 / 0.6)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="20" rx="80" ry="40" fill="url(#glow)" />
      {/* head */}
      <ellipse cx="100" cy="50" rx="20" ry="24" fill="url(#skin)" />
      {/* hair hint */}
      <path d="M80 40 Q100 18 120 40 Q120 28 100 24 Q80 28 80 40 Z" fill="oklch(0.25 0.04 290)" opacity="0.85" />
      {/* neck */}
      <rect x="94" y="72" width="12" height="8" fill="url(#skin)" />
      {/* torso */}
      {angle === "side" ? (
        <path d="M100 80 C115 90 115 130 110 160 C108 175 105 175 100 175 C95 175 92 175 90 160 C85 130 85 90 100 80 Z" fill="url(#skin)" />
      ) : (
        <path d="M76 88 Q100 80 124 88 L120 160 Q100 168 80 160 Z" fill="url(#skin)" />
      )}
      {/* arms */}
      <path d="M76 90 Q60 130 70 170" stroke="url(#skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M124 90 Q140 130 130 170" stroke="url(#skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* hips/legs */}
      {wheel ? (
        <>
          <rect x="70" y="160" width="60" height="40" rx="10" fill="url(#skin)" />
          <rect x="60" y="200" width="80" height="14" rx="6" fill="oklch(0.3 0.04 280)" />
          <circle cx="70" cy="230" r="22" fill="none" stroke="oklch(0.85 0.01 280)" strokeWidth="4" />
          <circle cx="130" cy="230" r="22" fill="none" stroke="oklch(0.85 0.01 280)" strokeWidth="4" />
        </>
      ) : (
        <>
          <path d="M82 160 Q86 200 88 250" stroke="url(#skin)" strokeWidth="18" strokeLinecap="round" fill="none" />
          <path d="M118 160 Q114 200 112 250" stroke="url(#skin)" strokeWidth="18" strokeLinecap="round" fill="none" />
          <ellipse cx="88" cy="262" rx="10" ry="4" fill="oklch(0.25 0.04 290)" />
          <ellipse cx="112" cy="262" rx="10" ry="4" fill="oklch(0.25 0.04 290)" />
        </>
      )}
      <text x="100" y="278" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.04 290)" opacity="0.6">{angle} · {pose}</text>
    </svg>
  );
}
