-- Closets: allow multiple closets per user
CREATE TABLE public.closets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.closets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closets_select_own" ON public.closets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "closets_insert_own" ON public.closets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "closets_update_own" ON public.closets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "closets_delete_own" ON public.closets FOR DELETE USING (auth.uid() = user_id);

-- Add closet_id to closet_items + closet_subcategories
ALTER TABLE public.closet_items ADD COLUMN closet_id uuid REFERENCES public.closets(id) ON DELETE CASCADE;
ALTER TABLE public.closet_subcategories ADD COLUMN closet_id uuid REFERENCES public.closets(id) ON DELETE CASCADE;

-- Backfill: create one default closet per existing user that has data, then assign
DO $$
DECLARE r record; new_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.closet_items WHERE closet_id IS NULL
  LOOP
    INSERT INTO public.closets (user_id, name) VALUES (r.user_id, 'My closet') RETURNING id INTO new_id;
    UPDATE public.closet_items SET closet_id = new_id WHERE user_id = r.user_id AND closet_id IS NULL;
    UPDATE public.closet_subcategories SET closet_id = new_id WHERE user_id = r.user_id AND closet_id IS NULL;
  END LOOP;
END $$;

CREATE INDEX idx_closet_items_closet_id ON public.closet_items(closet_id);
CREATE INDEX idx_closet_subcategories_closet_id ON public.closet_subcategories(closet_id);

-- Add is_child flag to models for kid-safe base outfit
ALTER TABLE public.models ADD COLUMN is_child boolean NOT NULL DEFAULT false;