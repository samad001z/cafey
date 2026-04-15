-- CMS-style dynamic content storage for website sections.
-- Public read, admin write.

create table if not exists public.website_content (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_website_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_website_content_updated_at on public.website_content;
create trigger trg_website_content_updated_at
before update on public.website_content
for each row
execute function public.set_website_content_updated_at();

alter table if exists public.website_content enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'website_content' and policyname = 'website_content_public_select'
  ) then
    create policy website_content_public_select
      on public.website_content
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'website_content' and policyname = 'website_content_admin_insert'
  ) then
    create policy website_content_admin_insert
      on public.website_content
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'website_content' and policyname = 'website_content_admin_update'
  ) then
    create policy website_content_admin_update
      on public.website_content
      for update
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'website_content' and policyname = 'website_content_admin_delete'
  ) then
    create policy website_content_admin_delete
      on public.website_content
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end;
$$;

insert into public.website_content (key, value)
values
  (
    'home_hero',
    jsonb_build_object(
      'pill', 'Fresh Roasted Daily · Single Origin',
      'headline', jsonb_build_array('Single Origin.', 'Well Grounded.', 'Quintessentially, Coffee.'),
      'subtext', 'Grown at 4500 ft in South India and served across 7 outlets in Hyderabad. At Qaffeine, every cup brings together craft roasting, thoughtful food pairing, and a bright cafe experience.',
      'special_title', 'Today''s Special',
      'special_item', 'Nutella Butter Latte',
      'special_note', 'Signature house favorite.'
    )
  ),
  (
    'home_categories',
    '["Coffee","Cold Brews","Shakes","Snacks","Desserts","Combos"]'::jsonb
  ),
  (
    'home_best_sellers',
    '[
      {"name":"Nutella Butter Latte","desc":"Velvety espresso with nutella cream and toasted cocoa dust.","rating":4.9,"image":"https://picsum.photos/seed/qaf1/420/320","isVeg":true},
      {"name":"Great Indian Filter Coffee","desc":"Aromatic decoction-style brew with balanced strength and depth.","rating":4.8,"image":"https://picsum.photos/seed/qaf2/420/320","isVeg":true},
      {"name":"Berry Blast","desc":"Bright berry-forward cooler with subtle citrus and mint finish.","rating":4.7,"image":"https://picsum.photos/seed/qaf3/420/320","isVeg":true},
      {"name":"Cold Brew","desc":"Slow extracted overnight for a smooth, low-acidity profile.","rating":4.8,"image":"https://picsum.photos/seed/qaf4/420/320","isVeg":true},
      {"name":"Loaded Fries","desc":"Golden fries with house seasoning and creamy signature drizzle.","rating":4.6,"image":"https://picsum.photos/seed/qaf5/420/320","isVeg":true},
      {"name":"Grilled Sandwich","desc":"Crunchy grilled bread layered with fresh fillings and cheese.","rating":4.8,"image":"https://picsum.photos/seed/qaf6/420/320","isVeg":true}
    ]'::jsonb
  ),
  (
    'home_why_cards',
    '[
      {"title":"Hand Selected Coffee","text":"Single-origin beans from South India estates, selectively harvested and carefully profiled for rich character."},
      {"title":"Bean to Brew","text":"From farm to cup, beans are transformed through controlled roasting and precision brewing by trained baristas."},
      {"title":"Your Qaffeine Cup","text":"Distinct taste and a perfect caffeine kick designed to match the way you like your coffee moments."}
    ]'::jsonb
  ),
  (
    'home_story_blocks',
    '[
      {"title":"True to its origin","text":"Grown in South India at an altitude of 4500 ft, Qaffeine beans are harvested with care and roasted to preserve authentic character in every sip.","image":"https://picsum.photos/seed/qaf-farm/920/640"},
      {"title":"Many takes, single blend","text":"From classic filter coffee to experimental lattes and shakes, we roast and brew one quality-forward blend remembered by everyone who visits.","image":"https://picsum.photos/seed/qaf-roastery/920/640"},
      {"title":"Taste the Qaffeine Difference","text":"From first step in till the final sip, each cup is designed to be crisp, bright, and energizing with a profile that feels distinctly Qaffeine.","image":"https://picsum.photos/seed/qaf-cup/920/640"}
    ]'::jsonb
  ),
  (
    'home_order_flow_steps',
    '[
      {"title":"Session Start","desc":"Open ordering from QR or direct menu access with branch-aware context.","tone":"scan"},
      {"title":"Basket Build","desc":"Add beverages and food with real-time totals, quantity edits, and smart grouping.","tone":"build"},
      {"title":"Kitchen Pipeline","desc":"Track preparation stages in one operational timeline from confirmation to ready.","tone":"brew"},
      {"title":"Handover","desc":"Receive completion updates when the order is served at table or ready for pickup.","tone":"serve"}
    ]'::jsonb
  )
on conflict (key) do nothing;
