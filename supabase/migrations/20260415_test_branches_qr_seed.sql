-- Seed 5 dedicated test branches with stable UUIDs for QR-based table testing.
-- Safe to run multiple times.

insert into public.branches (id, name, address, google_maps_url, phone, is_open)
values
  ('11111111-1111-4111-8111-111111111111', 'Qaffeine Test - Phoenix', 'Test Zone, Kokapet, Hyderabad', 'https://maps.app.goo.gl/eLc6bFX1byfZ9KE26', '+91 63093 97373', true),
  ('22222222-2222-4222-8222-222222222222', 'Qaffeine Test - Bhooja', 'Test Zone, My Home Bhooja, Hyderabad', 'https://maps.app.goo.gl/mSR1RUn6RUR2WzPH7', '+91 63093 97373', true),
  ('33333333-3333-4333-8333-333333333333', 'Qaffeine Test - Moosarambagh', 'Test Zone, Moosarambagh, Hyderabad', 'https://maps.app.goo.gl/NUF8sqSXNDC2n6YL8', '+91 63093 97373', true),
  ('44444444-4444-4444-8444-444444444444', 'Qaffeine Test - Secunderabad', 'Test Zone, Secunderabad, Hyderabad', 'https://maps.app.goo.gl/FFBkFFUSr1qNwBeq8', '+91 63093 97373', true),
  ('55555555-5555-4555-8555-555555555555', 'Qaffeine Test - GVK', 'Test Zone, GVK One Mall, Hyderabad', 'https://maps.app.goo.gl/1VerCU3S7T2uQmfS6', '+91 63093 97373', true)
on conflict (id)
do update set
  name = excluded.name,
  address = excluded.address,
  google_maps_url = excluded.google_maps_url,
  phone = excluded.phone,
  is_open = excluded.is_open;
