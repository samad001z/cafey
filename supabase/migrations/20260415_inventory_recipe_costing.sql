-- Step 6: Automated inventory deduction + recipe costing + low stock alerts.

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  item_name text not null,
  sku text,
  quantity numeric not null default 0,
  unit text default 'units',
  reorder_level numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory
  add column if not exists branch_id uuid references public.branches(id) on delete cascade,
  add column if not exists item_name text not null default 'Ingredient',
  add column if not exists quantity numeric not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  ingredient_id uuid not null references public.inventory(id) on delete cascade,
  quantity_required numeric not null check (quantity_required > 0),
  created_at timestamptz not null default now(),
  unique (menu_item_id, ingredient_id)
);

alter table public.inventory
  add column if not exists low_stock_threshold numeric not null default 0;

create table if not exists public.inventory_deductions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  old_status text,
  new_status text
);

create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  source_order_id uuid references public.orders(id) on delete set null,
  ingredient_name text not null,
  current_quantity numeric not null,
  low_stock_threshold numeric not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipes_menu_item_id on public.recipes(menu_item_id);
create index if not exists idx_inventory_alerts_branch_created on public.inventory_alerts(branch_id, created_at desc);

alter table public.recipes enable row level security;
alter table public.inventory_alerts enable row level security;

alter table public.recipes force row level security;
alter table public.inventory_alerts force row level security;

drop policy if exists recipes_admin_all on public.recipes;
create policy recipes_admin_all
  on public.recipes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists inventory_alerts_admin_all on public.inventory_alerts;
create policy inventory_alerts_admin_all
  on public.inventory_alerts
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create or replace function public.fn_deduct_inventory_on_order_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deduction_inserted integer := 0;
  updated_inventory record;
begin
  if not (
    (tg_op = 'INSERT' and new.status = 'confirmed')
    or
    (tg_op = 'UPDATE' and new.status = 'confirmed' and coalesce(old.status, '') <> 'confirmed')
  ) then
    return new;
  end if;

  insert into public.inventory_deductions (order_id, branch_id, old_status, new_status)
  values (new.id, new.branch_id, case when tg_op = 'UPDATE' then old.status else null end, new.status)
  on conflict (order_id) do nothing;

  get diagnostics deduction_inserted = row_count;
  if deduction_inserted = 0 then
    return new;
  end if;

  for updated_inventory in
    update public.inventory inv
      set quantity = inv.quantity - (r.quantity_required * oi.quantity),
          updated_at = now()
    from public.order_items oi
    join public.recipes r on r.menu_item_id = oi.menu_item_id
    where oi.order_id = new.id
      and inv.id = r.ingredient_id
      and inv.branch_id = new.branch_id
    returning inv.id, inv.item_name, inv.quantity, inv.low_stock_threshold
  loop
    if updated_inventory.quantity <= updated_inventory.low_stock_threshold then
      insert into public.inventory_alerts (
        branch_id,
        inventory_id,
        source_order_id,
        ingredient_name,
        current_quantity,
        low_stock_threshold,
        message
      )
      values (
        new.branch_id,
        updated_inventory.id,
        new.id,
        updated_inventory.item_name,
        updated_inventory.quantity,
        updated_inventory.low_stock_threshold,
        format(
          'Low stock: %s is at %s (threshold %s).',
          updated_inventory.item_name,
          updated_inventory.quantity,
          updated_inventory.low_stock_threshold
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_orders_deduct_inventory_on_confirmed on public.orders;
create trigger trg_orders_deduct_inventory_on_confirmed
after insert or update of status on public.orders
for each row
execute function public.fn_deduct_inventory_on_order_confirmed();
