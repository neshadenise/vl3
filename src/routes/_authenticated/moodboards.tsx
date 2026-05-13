import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, MoodboardPin } from "@/lib/store";
import { useState, PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ImagePlus, StickyNote, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/moodboards")({
  head: () => ({ meta: [{ title: "Moodboards · Virtual Lookbook" }] }),
  component: MoodboardsPage,
});

function uid() { return Math.random().toString(36).slice(2, 9); }

function MoodboardsPage() {
  const { moodboards, addMoodboard, updateMoodboard, removeMoodboard } = useStudio();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = moodboards.find((m) => m.id === activeId) || moodboards[0];

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Visual notes</div>
          <h1 className="font-display text-4xl md:text-5xl">Moodboards</h1>
        </div>
        <Button onClick={() => { const m = addMoodboard(`Board ${moodboards.length + 1}`); setActiveId(m.id); }}
          className="rounded-full bg-glow text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> New board</Button>
      </header>

      {moodboards.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="font-display text-2xl">Pin your inspiration</div>
          <p className="text-muted-foreground text-sm mt-2">Create a moodboard to start collecting images, notes & color swatches.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[220px_1fr] gap-4">
          <aside className="glass rounded-2xl p-2 max-h-[70vh] overflow-y-auto">
            {moodboards.map((m) => (
              <button key={m.id} onClick={() => setActiveId(m.id)}
                className={`w-full text-left rounded-xl p-3 text-sm flex items-center justify-between ${active?.id === m.id ? "bg-accent" : "hover:bg-accent/40"}`}>
                <span className="truncate">{m.name}</span>
                <button onClick={(e) => { e.stopPropagation(); removeMoodboard(m.id); }}><Trash2 className="h-3 w-3 text-destructive" /></button>
              </button>
            ))}
          </aside>
          {active && <BoardCanvas board={active} onUpdate={(p) => updateMoodboard(active.id, p)} />}
        </div>
      )}
    </AppLayout>
  );
}

function BoardCanvas({ board, onUpdate }: { board: ReturnType<typeof useStudio>["moodboards"][number]; onUpdate: (p: any) => void }) {
  const [imgUrl, setImgUrl] = useState("");
  const [noteText, setNoteText] = useState("");
  const [color, setColor] = useState("#c8a2ff");

  const addPin = (pin: MoodboardPin) => onUpdate({ pins: [...board.pins, pin] });
  const updatePin = (id: string, patch: Partial<MoodboardPin>) => onUpdate({ pins: board.pins.map((p) => p.id === id ? { ...p, ...patch } : p) });
  const removePin = (id: string) => onUpdate({ pins: board.pins.filter((p) => p.id !== id) });

  const drag = (id: string) => (e: PointerEvent<HTMLDivElement>) => {
    const pin = board.pins.find((p) => p.id === id); if (!pin) return;
    const start = { x: e.clientX, y: e.clientY, ox: pin.x, oy: pin.y };
    const move = (ev: any) => updatePin(id, { x: start.ox + (ev.clientX - start.x), y: start.oy + (ev.clientY - start.y) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <Input value={board.name} onChange={(e) => onUpdate({ name: e.target.value })} className="max-w-xs" />
        <div className="flex gap-2 ml-auto flex-wrap">
          <div className="flex glass rounded-full overflow-hidden">
            <Input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Image URL" className="border-0 bg-transparent w-44" />
            <Button size="sm" onClick={() => { if (imgUrl) { addPin({ id: uid(), type: "image", url: imgUrl, x: 40, y: 40, w: 180, h: 220 }); setImgUrl(""); } }}>
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex glass rounded-full overflow-hidden">
            <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Note" className="border-0 bg-transparent w-32" />
            <Button size="sm" onClick={() => { if (noteText) { addPin({ id: uid(), type: "note", text: noteText, x: 60, y: 60, w: 180, h: 100 }); setNoteText(""); } }}>
              <StickyNote className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex glass rounded-full overflow-hidden items-center px-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-7 bg-transparent" />
            <Button size="sm" onClick={() => { addPin({ id: uid(), type: "swatch", color, x: 80, y: 80, w: 100, h: 100 }); onUpdate({ palette: [...new Set([...board.palette, color])] }); }}>
              <Palette className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative h-[70vh] rounded-3xl overflow-hidden bg-dreamy shadow-ring-soft">
        <div className="absolute inset-0 stars opacity-40" />
        {board.pins.map((p) => (
          <div key={p.id} onPointerDown={drag(p.id)}
            className="absolute touch-none cursor-grab active:cursor-grabbing rounded-2xl shadow-soft overflow-hidden glass group"
            style={{ left: p.x, top: p.y, width: p.w, height: p.h, background: p.type === "swatch" ? p.color : undefined }}>
            {p.type === "image" && <img src={p.url} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />}
            {p.type === "note" && <div className="p-3 text-sm font-display">{p.text}</div>}
            {p.type === "swatch" && <div className="absolute bottom-1 right-2 text-[10px] text-white/80">{p.color}</div>}
            <button onClick={() => removePin(p.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 grid place-items-center opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
        {board.pins.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">Add an image, note, or swatch above ↑</div>
        )}
      </div>

      {board.palette.length > 0 && (
        <div className="glass rounded-2xl p-3 flex gap-2 items-center">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Palette</span>
          {board.palette.map((c) => <div key={c} className="h-8 w-8 rounded-full shadow-soft" style={{ background: c }} title={c} />)}
        </div>
      )}
    </div>
  );
}
