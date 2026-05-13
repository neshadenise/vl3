import { createFileRoute, Link } from "@tanstack/react-router";
import { useStudio } from "@/lib/store";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Virtual Lookbook · AI fashion atelier" }] }),
  component: Landing,
});

function Landing() {
  const { user } = useStudio();
  const cta = user ? { to: "/closet", label: "Open your closet" } : { to: "/login", label: "Sign in to start" };
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 stars opacity-100" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-28">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs uppercase tracking-[0.25em]">
          <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-glow" /> Atelier of one
        </div>
        <h1 className="mt-4 font-display text-5xl md:text-7xl leading-[1.05] text-foreground max-w-3xl">
          Generate your <span className="text-gradient">muse</span>.<br />Dress them with AI. Glow.
        </h1>
        <p className="mt-5 max-w-xl text-foreground/70 text-lg">
          Prompt a photorealistic fashion model. Upload clothes — AI styles them onto your model. Save looks, build moodboards, refine with words.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={cta.to as any} className="inline-flex items-center gap-2 rounded-full bg-glow px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
            <Sparkles className="h-4 w-4" /> {cta.label}
          </Link>
          {!user && (
            <Link to="/login" search={{ redirect: "/closet" } as any} className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-medium">
              Create an account <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
