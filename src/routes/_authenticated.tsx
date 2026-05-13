import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <h1 className="font-display text-3xl">Not found</h1>
      <Link to="/" className="underline text-sm mt-4 inline-block">Home</Link>
    </div>
  ),
});