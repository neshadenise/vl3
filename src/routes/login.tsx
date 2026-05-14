import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/closet" }),
  head: () => ({ meta: [{ title: "Sign in · Virtual Lookbook" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) nav({ to: search.redirect as any });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: search.redirect as any });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/closet" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account ✦");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/closet" });
    if (res.error) { toast.error((res.error as any)?.message || "Google sign-in failed"); setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-dreamy">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="h-9 w-9 rounded-2xl bg-glow shadow-glow grid place-items-center text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
          <span className="font-display text-xl">Virtual <span className="text-gradient">Lookbook</span></span>
        </Link>
        <h1 className="font-display text-3xl">{mode === "signin" ? "Welcome back" : "Create your studio"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin" ? "Sign in to your closet, models, and lookbook." : "Sign up to start styling your AI muse."}
        </p>

        <Button type="button" onClick={google} disabled={busy} variant="outline" className="w-full mt-6 rounded-full">
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full bg-glow text-primary-foreground shadow-glow">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-xs text-muted-foreground underline">
          {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}