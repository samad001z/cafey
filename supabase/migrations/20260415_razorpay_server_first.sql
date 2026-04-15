-- Step 4: Razorpay server-first flow with idempotent order creation.

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  razorpay_order_id text not null unique,
  customer_id uuid references public.profiles(id),
  branch_id uuid not null references public.branches(id),
  order_payload jsonb not null,
  items_payload jsonb not null,
  amount numeric not null,
  currency text not null default 'INR',
  status text not null default 'created',
  razorpay_payment_id text,
  created_order_id uuid references public.orders(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_intents_razorpay_order_id
  on public.payment_intents (razorpay_order_id);

create index if not exists idx_payment_intents_status
  on public.payment_intents (status);

create unique index if not exists uq_orders_razorpay_order_id
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;
