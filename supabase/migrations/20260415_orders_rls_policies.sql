-- Allow authenticated customers to manage and view their own orders.
-- Safe to run multiple times.

alter table if exists public.orders enable row level security;

-- Keep order_items non-RLS by default for compatibility; uncomment next line if you want strict item-level RLS.
-- alter table if exists public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_select_own'
  ) then
    create policy orders_select_own
      on public.orders
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_insert_own'
  ) then
    create policy orders_insert_own
      on public.orders
      for insert
      to authenticated
      with check (customer_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_update_own'
  ) then
    create policy orders_update_own
      on public.orders
      for update
      to authenticated
      using (customer_id = auth.uid())
      with check (customer_id = auth.uid());
  end if;
end;
$$;
