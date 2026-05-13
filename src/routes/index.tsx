import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio } from "@/lib/store";
import { Wand2, Shirt, BookHeart, Sparkles, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Virtual Lookbook" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { items, looks, collections, moodboards } = useStudio();

  const stats = [
    { label: "Closet items", value: items.length, to: "/closet", icon: Shirt },
    { label: "Saved looks", value: looks.length, to: "/lookbook", icon: BookHeart },
    { label: "Collections", value: collections.length, to: "/collections", icon: Sparkles },
    { label: "Moodboards", value: moodboards.length, to: "/moodboards", icon: Wand2 },
  ];

  return (
    <AppLayout>
      <section className="relative overflow-hidden rounded-3xl bg-dreamy p-8 md:p-12 shadow-soft">
        <div className="absolute inset-0 stars opacity-60 pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs uppercase tracking-[0.25em]">
            <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-glow" /> Atelier of one
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl leading-[1.05] text-foreground">
            Generate your <span className="text-gradient">muse</span>.<br />Dress her with AI. Glow.
          </h1>
          <p className="mt-4 max-w-xl text-foreground/70">
            Prompt a photorealistic fashion model. Tap a piece from your closet — AI dresses the model in it. Restyle with words. No drag, no drop.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/models" className="inline-flex items-center gap-2 rounded-full bg-glow px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow ring-glow">
              <Sparkles className="h-4 w-4" /> Generate a model
            </Link>
            <Link to="/closet" className="inline-flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add closet items
            </Link>
          </div>
        </div>

        <div className="hidden md:flex absolute right-8 bottom-8 gap-3">
          {["lavender","blush","ice","silver"].map((c) => (
            <div key={c} className="h-16 w-16 rounded-2xl shadow-soft animate-float" style={{ background: `var(--${c})`, animationDelay: `${Math.random()*2}s` }} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group glass rounded-2xl p-4 hover:shadow-glow transition-all">
            <div className="flex items-center justify-between">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="mt-3 font-display text-3xl">{s.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">{s.label}</div>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid md:grid-cols-3 gap-4">
        <Card title="1. Build your closet" body="Upload clothes or paste image URLs. Tag, color, organize." to="/closet" cta="Upload items" />
        <Card title="2. Generate a model" body="Describe a muse — body, vibe, hair, skin. AI renders her in basic underwear, ready to dress." to="/models" cta="Pick a muse" />
        <Card title="3. Let AI style" body="Tap a closet piece, AI puts it on. Then prompt: ‘open shirt off the shoulders’." to="/studio" cta="Start styling" />
      </section>
    </AppLayout>
  );
}

function Card({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="font-display text-xl">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground flex-1">{body}</p>
      <Link to={to} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gradient">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
