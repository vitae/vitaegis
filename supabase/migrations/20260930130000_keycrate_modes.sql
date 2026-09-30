-- KeyCrate: three more build modes (Downtempo, Uptempo, Ambient) next to Smooth, Dramatic
-- and Journey. Widens the check on kc_playlists.mode. Until this is applied the app stores
-- 'journey' in the column for the new modes and keeps the real mode in target_curve.

alter table public.kc_playlists drop constraint if exists kc_playlists_mode_check;
alter table public.kc_playlists
  add constraint kc_playlists_mode_check
  check (mode in ('smooth', 'dramatic', 'journey', 'downtempo', 'uptempo', 'ambient'));
