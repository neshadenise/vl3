
revoke execute on function public.consume_credit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
