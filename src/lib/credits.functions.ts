import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBalanceFor } from "./credits.server";

export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    try {
      const c = await getBalanceFor(userId);
      return { balance: c.balance, generationsUsed: c.generations_used, tier: c.tier };
    } catch (e: any) {
      return { balance: 0, generationsUsed: 0, tier: "free", error: e?.message || "Could not load credits" };
    }
  });