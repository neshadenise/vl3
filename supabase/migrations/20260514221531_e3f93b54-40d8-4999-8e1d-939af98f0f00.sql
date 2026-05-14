
ALTER TABLE public.closet_items
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS season text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.closet_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, name)
);

ALTER TABLE public.closet_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcat_select_own" ON public.closet_subcategories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subcat_insert_own" ON public.closet_subcategories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subcat_delete_own" ON public.closet_subcategories
  FOR DELETE USING (auth.uid() = user_id);
