import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getBalanceFor(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_credits")
    .select("balance, generations_used, tier")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Seed defensively if the row is missing.
    const ins = await supabaseAdmin
      .from("user_credits")
      .insert({ user_id: userId, balance: 25, generations_used: 0, tier: "free" })
      .select("balance, generations_used, tier")
      .single();
    return ins.data ?? { balance: 0, generations_used: 0, tier: "free" };
  }
  return data;
}

export async function hasCredits(userId: string, cost = 1) {
  const c = await getBalanceFor(userId);
  return (c?.balance ?? 0) >= cost;
}

/** Atomic deduction via RPC. Throws if insufficient. */
export async function consumeCreditFor(userId: string, cost = 1) {
  const { data, error } = await supabaseAdmin.rpc("consume_credit", {
    _user_id: userId,
    _cost: cost,
  });
  if (error) throw error;
  return data as number;
}