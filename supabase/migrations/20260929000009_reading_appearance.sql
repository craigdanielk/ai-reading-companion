-- Reading-appearance preferences for the e-reader surface.
-- All defaults chosen for a comfortable, calm default.
alter table public.user_preference
  add column if not exists reading_font text not null default 'serif' check (reading_font in ('serif', 'sans')),
  add column if not exists reading_size text not null default 'medium' check (reading_size in ('small', 'medium', 'large', 'xl')),
  add column if not exists reading_theme text not null default 'paper' check (reading_theme in ('paper', 'sepia', 'night')),
  add column if not exists reading_measure text not null default 'normal' check (reading_measure in ('narrow', 'normal', 'wide'));
