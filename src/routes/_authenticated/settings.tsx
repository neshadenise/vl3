import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStudio } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Moon, Sun, Trash2, Download, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Virtual Lookbook" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme, items, looks, collections, moodboards } = useStudio();

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ items, looks, collections, moodboards }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "style-doll-studio.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported ✦");
  };

  const wipe = () => {
    if (!confirm("Delete all local data?")) return;
    localStorage.removeItem("sds:v1"); location.reload();
  };

  return (
    <AppLayout>
      <header className="mb-6">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Atelier preferences</div>
        <h1 className="font-display text-4xl md:text-5xl">Settings</h1>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Theme" desc="Switch between Pastel Goth and Dark Astrology.">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTheme("pastel")} className={`rounded-2xl p-4 text-left ${theme === "pastel" ? "bg-glow text-primary-foreground shadow-glow" : "glass"}`}>
              <Sun className="h-4 w-4" />
              <div className="font-display text-lg mt-2">Pastel Goth</div>
              <div className="text-xs opacity-80">Lavender · Blush · Ice</div>
            </button>
            <button onClick={() => setTheme("astro")} className={`rounded-2xl p-4 text-left ${theme === "astro" ? "bg-glow text-primary-foreground shadow-glow" : "glass"}`}>
              <Moon className="h-4 w-4" />
              <div className="font-display text-lg mt-2">Dark Astrology</div>
              <div className="text-xs opacity-80">Celestial · Silver · Navy</div>
            </button>
          </div>
        </Section>

        <Section title="Storage" desc="Your studio lives in this browser.">
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{items.length} closet items</li>
            <li>{looks.length} saved looks</li>
            <li>{collections.length} collections</li>
            <li>{moodboards.length} moodboards</li>
          </ul>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4 mr-1" /> Export JSON</Button>
            <Button variant="destructive" onClick={wipe}><Trash2 className="h-4 w-4 mr-1" /> Reset studio</Button>
          </div>
        </Section>

        <Section title="Accessibility" desc="Inclusive by default.">
          <p className="text-sm text-muted-foreground">High-contrast tokens, screen-reader labels, and disability-inclusive models are built into the core, not a toggle.</p>
        </Section>

        <Section title="Accounts (coming soon)" desc="Cloud sync, sign-in, shared collections.">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Build the look first — auth lands later.</div>
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{desc}</p>
      {children}
    </div>
  );
}
