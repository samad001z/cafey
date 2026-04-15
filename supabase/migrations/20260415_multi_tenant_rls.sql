-- Step 3: Production-grade multi-tenant RLS
-- Enforces strict branch tenancy for staff/admin and customer isolation.

-- 1) Ensure inventory table exists for branch-scoped stock management.
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  item_name text not null,
  sku text,
  quantity numeric not null default 0,
  unit text default 'units',
  reorder_level numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_branch_id on public.inventory(branch_id);
create index if not exists idx_attendance_branch_id on public.attendance(branch_id);
create index if not exists idx_orders_branch_id on public.orders(branch_id);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_profiles_id_role_branch on public.profiles(id, role, branch_id);

-- 2) Ensure staff/admin profiles always have a branch_id.
with default_branch as (
  select id
  from public.branches
  order by created_at asc, id asc
  limit 1
)
update public.profiles p
set branch_id = b.id
from default_branch b
where p.role in ('staff', 'admin')
  and p.branch_id is null;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where role in ('staff', 'admin')
      and branch_id is null
  ) then
    raise exception 'Profiles with role staff/admin must have a branch_id before enabling strict tenancy.';
  end if;
end
$$;

alter table public.profiles
  drop constraint if exists profiles_staff_admin_branch_required;

alter table public.profiles
  add constraint profiles_staff_admin_branch_required
  check (coalesce(role, 'customer') = 'customer' or branch_id is not null);

-- 3) Enable and force RLS on tenant-sensitive tables.
alter table public.orders enable row level security;
alter table public.attendance enable row level security;
alter table public.inventory enable row level security;

alter table public.orders force row level security;
alter table public.attendance force row level security;
alter table public.inventory force row level security;

-- 4) Replace legacy policies with strict, explicit tenant policies.
drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_insert_own on public.orders;
drop policy if exists orders_update_own on public.orders;
drop policy if exists orders_staff_admin_select on public.orders;
drop policy if exists orders_staff_admin_insert on public.orders;
drop policy if exists orders_staff_admin_update on public.orders;

drop policy if exists attendance_staff_select_branch on public.attendance;
drop policy if exists attendance_staff_insert_branch on public.attendance;
drop policy if exists attendance_staff_update_branch on public.attendance;
drop policy if exists attendance_admin_all on public.attendance;

drop policy if exists inventory_staff_select_branch on public.inventory;
drop policy if exists inventory_staff_insert_branch on public.inventory;
drop policy if exists inventory_staff_update_branch on public.inventory;
drop policy if exists inventory_admin_all on public.inventory;

-- ORDERS
-- Customers: only own orders.
create policy orders_customer_select_own
  on public.orders
  for select
  to authenticated
  using (customer_id = (select auth.uid()));

-- Customers can create only their own order rows.
create policy orders_customer_insert_own
  on public.orders
  for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

-- Staff: select/update only branch-matching orders.
create policy orders_staff_select_branch
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = orders.branch_id
    )
  );

create policy orders_staff_update_branch
  on public.orders
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = orders.branch_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = orders.branch_id
    )
  );

-- Admin: see and manage all branches.
create policy orders_admin_all
  on public.orders
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

-- ATTENDANCE
-- Staff: branch-scoped read/write.
create policy attendance_staff_select_branch
  on public.attendance
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = attendance.branch_id
    )
  );

create policy attendance_staff_insert_branch
  on public.attendance
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = attendance.branch_id
    )
  );

create policy attendance_staff_update_branch
  on public.attendance
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = attendance.branch_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = attendance.branch_id
    )
  );

-- Admin: full branch access.
create policy attendance_admin_all
  on public.attendance
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

-- INVENTORY
-- Staff: branch-scoped read/write.
create policy inventory_staff_select_branch
  on public.inventory
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = inventory.branch_id
    )
  );

create policy inventory_staff_insert_branch
  on public.inventory
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = inventory.branch_id
    )
  );

create policy inventory_staff_update_branch
  on public.inventory
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = inventory.branch_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.branch_id = inventory.branch_id
    )
  );

-- Admin: full branch access.
create policy inventory_admin_all
  on public.inventory
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
