import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio, POSE_PRESETS, MODEL_PROMPT_PRESETS, Model } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Plus, Trash2, Edit3, Upload, User, Baby } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { generateModel } from "@/lib/ai.functions";
import { uploadDataUrl, uploadFile } from "@/lib/storage";

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
          <p className="text-muted-foreground mt-1 text-sm">Generate a photorealistic AI model — or upload your own full-body photo to see how outfits would look on you.</p>
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
  const [tab, setTab] = useState<"generate" | "upload">("generate");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pose, setPose] = useState(POSE_PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [isChild, setIsChild] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | null) => {
    setPhotoFile(f);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(f ? URL.createObjectURL(f) : "");
  };

  const submit = async () => {
    setBusy(true);
    try {
      let url: string;
      let modelPrompt: string;
      let modelPose: string;

      if (tab === "upload") {
        if (!photoFile) { toast.error("Choose a full-body photo first"); setBusy(false); return; }
        if (!photoFile.type.startsWith("image/")) { toast.error("That file is not an image"); setBusy(false); return; }
        url = await uploadFile(photoFile, "models");
        modelPrompt = prompt.trim() || "Personal reference photo of the user; preserve their face, body, skin tone, hair, and proportions exactly.";
        modelPose = "Original photo pose";
      } else {
        if (!prompt.trim()) { toast.error("Describe your model first"); setBusy(false); return; }
        const res = await generateModel({ data: { prompt, pose, isChild } });
        if (res.error || !res.dataUrl) { toast.error(res.error || "Generation failed"); setBusy(false); return; }
        url = await uploadDataUrl(res.dataUrl, "models");
        modelPrompt = prompt;
        modelPose = pose;
      }

      const model = await addModel({
        name: name || (tab === "upload" ? "My photo" : "Untitled model"),
        prompt: modelPrompt, pose: modelPose,
        baseImageUrl: url, currentImageUrl: url, isChild: tab === "generate" ? isChild : false,
      });
      if (!model) { toast.error("Could not save model"); setBusy(false); return; }
      toast.success(tab === "upload" ? "Photo ready ✦" : "Model generated ✦");
      setOpen(false);
      setName(""); setPrompt(""); onPickFile(null);
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
        <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><Sparkles className="h-5 w-5" /> New model</DialogTitle></DialogHeader>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Name (optional)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Luna" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="generate"><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate AI</TabsTrigger>
            <TabsTrigger value="upload"><User className="h-3.5 w-3.5 mr-1" /> Use my photo</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-3 mt-3">
            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${isChild ? "bg-glow text-primary-foreground shadow-glow border-transparent" : "glass"}`}>
              <input type="checkbox" className="sr-only" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} />
              <Baby className="h-4 w-4" />
              <span className="text-sm font-medium">This is a child model</span>
              <span className="ml-auto text-[11px] opacity-80">Modest tank top + shorts base</span>
            </label>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Describe your model</label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder={isChild ? "Cheerful 7-year-old, curly brown hair, light brown skin, freckles..." : "Tall androgynous person, soft freckles, natural curls, warm olive skin..."} />
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
            <p className="text-xs text-muted-foreground">Models are generated in a neutral fitted base layer. As you add tops or bottoms in the studio, the base layer is replaced automatically.</p>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 mt-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border border-dashed border-border bg-background/40 hover:bg-accent/40 transition cursor-pointer p-6 text-center"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Your reference" className="mx-auto max-h-64 rounded-xl object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <div className="text-sm font-medium text-foreground">Upload a full-body photo of yourself</div>
                  <div className="text-xs">Best results: front-facing, full body, plain background, fitted clothing.</div>
                </div>
              )}
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
            </div>
            {photoPreview && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onPickFile(null)}>Remove photo</Button>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Note about you (optional)</label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder='e.g. "preserve my curly hair and glasses"' />
            </div>
            <p className="text-xs text-muted-foreground">Your photo stays in your private studio. Outfits will be applied directly on top of it so you can preview them on yourself.</p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-glow text-primary-foreground shadow-glow">
            {busy ? (tab === "upload" ? "Uploading…" : "Generating…") : (tab === "upload" ? "Use this photo ✦" : "Generate ✦")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
