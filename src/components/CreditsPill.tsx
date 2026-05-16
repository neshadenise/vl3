import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyCredits } from "@/lib/credits.functions";
import { Sparkles } from "lucide-react";
import { useStudio } from "@/lib/store";

export function CreditsPill() {
  const { user } = useStudio();
  const fetchCredits = useServerFn(getMyCredits);
  const [bal, setBal] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("free");
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const r: any = await fetchCredits();
        if (alive) { setBal(r.balance ?? 0); setTier(r.tier || "free"); }
      } catch {}
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [user, fetchCredits]);
  if (!user) return null;
  return (
    <div className="h-9 px-3 rounded-full glass flex items-center gap-2 text-xs" title={`${tier} tier`}>
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">{bal ?? "—"}</span>
      <span className="text-muted-foreground">credits</span>
    </div>
  );
}