-- Customer post-order reviews tied to completed orders.
-- Allows customers to submit/skip once per order, admin to review/moderate,
-- and keeps staff blocked from this dataset.

create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  rating_food int,
  rating_service int,
  review_text text,
  skipped boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_reviews_rating_food_check check (rating_food between 1 and 5 or rating_food is null),
  constraint order_reviews_rating_service_check check (rating_service between 1 and 5 or rating_service is null),
  constraint order_reviews_content_check check (
    skipped = true
    or (
      skipped = false
      and rating_food is not null
      and rating_service is not null
      and coalesce(length(trim(review_text)), 0) > 0
    )
  )
);

create index if not exists idx_order_reviews_customer_id on public.order_reviews(customer_id);
create index if not exists idx_order_reviews_branch_id on public.order_reviews(branch_id);
create index if not exists idx_order_reviews_created_at on public.order_reviews(created_at desc);

create or replace function public.set_order_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_order_reviews_updated_at on public.order_reviews;
create trigger trg_order_reviews_updated_at
before update on public.order_reviews
for each row
execute function public.set_order_reviews_updated_at();

alter table if exists public.order_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_reviews'
      and policyname = 'order_reviews_select_own'
  ) then
    create policy order_reviews_select_own
      on public.order_reviews
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_reviews'
      and policyname = 'order_reviews_insert_own_completed_order'
  ) then
    create policy order_reviews_insert_own_completed_order
      on public.order_reviews
      for insert
      to authenticated
      with check (
        customer_id = auth.uid()
        and exists (
          select 1
          from public.orders o
          where o.id = order_reviews.order_id
            and o.customer_id = auth.uid()
            and o.status = 'completed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_reviews'
      and policyname = 'order_reviews_update_own'
  ) then
    create policy order_reviews_update_own
      on public.order_reviews
      for update
      to authenticated
      using (customer_id = auth.uid())
      with check (customer_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_reviews'
      and policyname = 'order_reviews_admin_select_all'
  ) then
    create policy order_reviews_admin_select_all
      on public.order_reviews
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_reviews'
      and policyname = 'order_reviews_admin_update_all'
  ) then
    create policy order_reviews_admin_update_all
      on public.order_reviews
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;
end;
$$;
