create table profiles (
  id uuid references auth.users primary key,
  role text check (role in ('customer','staff','admin')) default 'customer',
  full_name text, phone text, avatar_url text,
  branch_id uuid, employee_id text, is_active boolean default true,
  created_at timestamptz default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null, address text, google_maps_url text,
  phone text, is_open boolean default true,
  created_at timestamptz default now()
);

insert into branches (name, address, google_maps_url) values
('Centaurus by Phoenix','Neopolis, Kokapet, Hyderabad','https://maps.app.goo.gl/eLc6bFX1byfZ9KE26'),
('My Home Bhooja','Kokapet, Hyderabad','https://maps.app.goo.gl/mSR1RUn6RUR2WzPH7'),
('Moosarambagh','Moosarambagh, Hyderabad','https://maps.app.goo.gl/NUF8sqSXNDC2n6YL8'),
('Secunderabad','Secunderabad, Hyderabad','https://maps.app.goo.gl/FFBkFFUSr1qNwBeq8'),
('GVK One Mall','Banjara Hills, Hyderabad','https://maps.app.goo.gl/1VerCU3S7T2uQmfS6'),
('Yashoda Hospitals Hitech City','Hitech City, Hyderabad','https://maps.app.goo.gl/Vr1ZHNtGvXGomcHJ9'),
('Qaffeine Bistro','Hyderabad','https://maps.app.goo.gl/mLi6zaZXdrdVK2bg7');

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text, price numeric,
  category text, is_veg boolean default true,
  is_available boolean default true, image_url text,
  is_bestseller boolean default false,
  branch_id uuid references branches(id),
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  branch_id uuid references branches(id),
  order_type text check (order_type in ('dine_in','takeaway','table_order')),
  table_number text,
  status text check (status in ('placed','confirmed','preparing','ready','completed','cancelled')) default 'placed',
  total_amount numeric, payment_status text default 'pending',
  razorpay_order_id text, created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  menu_item_id uuid references menu_items(id),
  quantity int, unit_price numeric
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  branch_id uuid references branches(id),
  date date, time_slot text, party_size int,
  customer_name text, phone text, special_requests text,
  status text check (status in ('pending','confirmed','cancelled')) default 'pending',
  ref_code text unique default 'QF-' || upper(substr(gen_random_uuid()::text,1,6)),
  created_at timestamptz default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references profiles(id),
  branch_id uuid references branches(id),
  checked_in_at timestamptz, checked_out_at timestamptz,
  date date default current_date,
  status text check (status in ('present','absent','late')) default 'absent'
);

alter table profiles enable row level security;
alter table orders enable row level security;
alter table attendance enable row level security;
