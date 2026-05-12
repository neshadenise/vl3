
insert into storage.buckets (id, name, public)
values ('studio-images', 'studio-images', true)
on conflict (id) do nothing;

-- Public read
create policy "Public read studio-images"
on storage.objects for select
using (bucket_id = 'studio-images');

-- Anyone can upload (no auth model in app yet)
create policy "Anyone can upload studio-images"
on storage.objects for insert
with check (bucket_id = 'studio-images');

create policy "Anyone can update studio-images"
on storage.objects for update
using (bucket_id = 'studio-images');

create policy "Anyone can delete studio-images"
on storage.objects for delete
using (bucket_id = 'studio-images');
