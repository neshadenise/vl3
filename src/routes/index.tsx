import { createFileRoute, Link } from "@tanstack/react-router";
import { useStudio } from "@/lib/store";
import { Sparkles, ArrowRight, Wand2, Shirt, BookHeart, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, CSSProperties } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Virtual Lookbook · AI fashion studio" }] }),
  component: Landing,
});

function Landing() {
  const { user, theme, setTheme, models } = useStudio();
  const cta = user ? { to: "/closet", label: "Open your closet" } : { to: "/login", label: "Sign in to start" };
  const heroRef = useRef<HTMLDivElement>(null);

  // Latest worked-on model: prefer styled render, fallback to base.
  const latestModel = useMemo(() => {
    if (!models?.length) return null;
    return [...models].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [models]);
  const museImage = latestModel?.currentImageUrl || latestModel?.baseImageUrl || null;

  // Cursor spotlight
  const onMove = (e: React.MouseEvent) => {
    const el = heroRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  // Reveal-on-scroll
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const key = (e.target as HTMLElement).dataset.reveal!;
          setRevealed((p) => ({ ...p, [key]: true }));
        }
      }
    }, { threshold: 0.18 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const reveal = (k: string): CSSProperties => ({
    opacity: revealed[k] ? 1 : 0,
    transform: revealed[k] ? "translateY(0)" : "translateY(28px)",
    transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(.2,.7,.2,1)",
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 stars animate-twinkle" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-dreamy opacity-30 animate-shimmer" aria-hidden />

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onMove}
        className="relative mx-auto max-w-6xl px-6 py-16 md:py-28"
      >
        <div className="pointer-events-none absolute inset-0 spotlight" aria-hidden />

        <div className="relative grid md:grid-cols-[1.15fr_1fr] gap-10 items-center">
          <div>
            <button
              onClick={() => setTheme(theme === "pastel" ? "astro" : "pastel")}
              className="animate-rise inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs uppercase tracking-[0.25em] hover:shadow-glow transition"
              title="Toggle theme"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-glow" />
              {theme === "pastel" ? "Pastel goth · tap for astro" : "Dark astro · tap for pastel"}
              {theme === "pastel" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </button>

            <h1 className="animate-rise-delay-1 mt-5 font-display text-5xl md:text-7xl leading-[1.02] text-foreground max-w-3xl">
              Generate your <span className="text-gradient animate-shimmer">muse</span>.
              <br />
              Dress them with AI. <span className="inline-block animate-float">Glow.</span>
            </h1>

            <p className="animate-rise-delay-2 mt-5 max-w-xl text-foreground/70 text-lg">
              Prompt a photorealistic fashion model. Upload clothes — AI styles them onto your model. Save looks, build moodboards, refine with words.
            </p>

            <div className="animate-rise-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                to={cta.to as any}
                className="group inline-flex items-center gap-2 rounded-full bg-glow px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow hover:scale-[1.03] active:scale-95 transition-transform"
              >
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" /> {cta.label}
              </Link>
              {!user && (
                <Link
                  to="/login"
                  search={{ redirect: "/closet" } as any}
                  className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-medium hover:shadow-glow transition-shadow"
                >
                  Create an account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </div>
          </div>

          {/* Floating muse mockup */}
          <div className="relative h-[420px] md:h-[520px] hidden md:block">
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative h-72 w-72 rounded-full bg-glow shadow-glow opacity-80 animate-pulse-glow" />
            </div>
            <div className="absolute inset-0 animate-orbit">
              <FloatChip className="absolute top-4 left-6" icon={<Shirt className="h-4 w-4" />} label="Upload" />
              <FloatChip className="absolute top-1/3 right-2" icon={<Wand2 className="h-4 w-4" />} label="Style" />
              <FloatChip className="absolute bottom-8 left-10" icon={<BookHeart className="h-4 w-4" />} label="Lookbook" />
              <FloatChip className="absolute bottom-20 right-8" icon={<Sparkles className="h-4 w-4" />} label="Glow" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-8 animate-float">
              <div className="glass rounded-3xl p-3 w-44 shadow-soft">
                <div className="aspect-[3/4] rounded-2xl bg-dreamy overflow-hidden">
                  {museImage ? (
                    <img src={museImage} alt="Your latest muse" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Your muse</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div data-reveal="title" style={reveal("title")} className="mb-10">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Three moves</div>
          <h2 className="font-display text-4xl md:text-5xl mt-1">From closet to <span className="text-gradient">cover shoot</span>.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: <Shirt className="h-5 w-5" />, t: "Upload", d: "Drop garments — AI auto-tags brand, color, category." },
            { i: <Wand2 className="h-5 w-5" />, t: "Style", d: "Pick a muse. Try things on. Restyle with a sentence." },
            { i: <BookHeart className="h-5 w-5" />, t: "Save", d: "Build looks, collections, moodboards. Share the glow." },
          ].map((s, idx) => (
            <div
              key={s.t}
              data-reveal={`step-${idx}`}
              style={reveal(`step-${idx}`)}
              className="group glass rounded-3xl p-6 hover:shadow-glow transition-all hover:-translate-y-1"
            >
              <div className="h-10 w-10 rounded-2xl bg-glow shadow-glow grid place-items-center text-primary-foreground group-hover:rotate-6 transition-transform">
                {s.i}
              </div>
              <div className="font-display text-2xl mt-3">{s.t}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Theme preview strip */}
        <div data-reveal="strip" style={reveal("strip")} className="mt-14 glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-glow opacity-30 blur-3xl animate-drift" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Two moods</div>
              <h3 className="font-display text-3xl mt-1">Pastel goth · Dark astrology</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The whole studio shifts with your mood. Lavender haze by day, celestial ink by night.
              </p>
              <button
                onClick={() => setTheme(theme === "pastel" ? "astro" : "pastel")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-glow text-primary-foreground px-5 py-2.5 text-sm shadow-glow hover:scale-[1.03] transition"
              >
                {theme === "pastel" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Try the {theme === "pastel" ? "astro" : "pastel"} theme
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 aspect-[3/4] rounded-2xl bg-dreamy animate-float" />
              <div className="flex-1 aspect-[3/4] rounded-2xl bg-glow shadow-glow animate-pulse-glow" />
              <div className="flex-1 aspect-[3/4] rounded-2xl bg-ink animate-float" style={{ animationDelay: "1.5s" }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FloatChip({ className, icon, label }: { className?: string; icon: React.ReactNode; label: string }) {
  return (
    <div className={`${className} animate-float`}>
      <div className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-soft">
        <span className="text-primary">{icon}</span> {label}
      </div>
    </div>
  );
}
