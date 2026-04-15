alter table menu_items
  add column if not exists modifiers jsonb not null default '{}'::jsonb;

alter table menu_items
  drop constraint if exists menu_items_modifiers_object_check;

alter table menu_items
  add constraint menu_items_modifiers_object_check
  check (jsonb_typeof(modifiers) = 'object');
