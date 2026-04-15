-- Grant branch-level orders access to staff and full orders access to admin.
-- Safe to run multiple times.

alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_staff_admin_select'
  ) then
    create policy orders_staff_admin_select
      on public.orders
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = orders.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_staff_admin_insert'
  ) then
    create policy orders_staff_admin_insert
      on public.orders
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = orders.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_staff_admin_update'
  ) then
    create policy orders_staff_admin_update
      on public.orders
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = orders.branch_id)
            )
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = orders.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_staff_admin_select'
  ) then
    create policy order_items_staff_admin_select
      on public.order_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          join public.profiles p on p.id = auth.uid()
          where o.id = order_items.order_id
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = o.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_staff_admin_insert'
  ) then
    create policy order_items_staff_admin_insert
      on public.order_items
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.orders o
          join public.profiles p on p.id = auth.uid()
          where o.id = order_items.order_id
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = o.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_staff_admin_update'
  ) then
    create policy order_items_staff_admin_update
      on public.order_items
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          join public.profiles p on p.id = auth.uid()
          where o.id = order_items.order_id
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = o.branch_id)
            )
        )
      )
      with check (
        exists (
          select 1
          from public.orders o
          join public.profiles p on p.id = auth.uid()
          where o.id = order_items.order_id
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = o.branch_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_staff_admin_delete'
  ) then
    create policy order_items_staff_admin_delete
      on public.order_items
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          join public.profiles p on p.id = auth.uid()
          where o.id = order_items.order_id
            and (
              p.role = 'admin'
              or (p.role = 'staff' and p.branch_id = o.branch_id)
            )
        )
      );
  end if;
end;
$$;
