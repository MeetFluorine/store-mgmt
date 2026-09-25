-- =========================================================
-- Migration 007: real store list + employee-selected store
--
-- 1) Store coordinates become nullable — you gave us the 42 real
--    store codes, but not their coordinates yet. A store with no
--    coordinates is now a normal, valid, "not yet geofenced" state
--    rather than something that has to be faked with 0,0. The app
--    shows a clear "location not configured" message instead of
--    letting punches silently pass/fail against fake coordinates.
-- 2) Anyone (not just signed-in users) can read active stores —
--    needed so the registration dropdown can show real stores
--    before the person has an account yet.
-- 3) employees.requested_store_id — the store the employee picked
--    at registration. Admin approval now just activates the
--    account against THIS store; no separate store picker needed
--    for admin (though Pending Approvals still shows a fallback
--    picker for any older registrations that only have the old
--    free-text requested_store_name).
-- =========================================================

alter table stores alter column latitude drop not null;
alter table stores alter column longitude drop not null;

alter table employees add column if not exists requested_store_id uuid references stores(id);

drop policy if exists "authenticated users read stores" on stores;
create policy "anyone can read active stores" on stores
  for select using (status = 'active');

-- ---- Import the real store list (coordinates to be filled in
-- later via Admin → Stores as each location is confirmed) ----
insert into stores (store_code, store_name, status) values
  ('IXR_DS_Ranchi', 'IXR_DS_Ranchi', 'active'),
  ('IDR_DS_Tilaknagar', 'IDR_DS_Tilaknagar', 'active'),
  ('BPL_DS_Chunabhatti', 'BPL_DS_Chunabhatti', 'active'),
  ('BAP_DS_Bilaspur', 'BAP_DS_Bilaspur', 'active'),
  ('BIA_DS_Bhilai', 'BIA_DS_Bhilai', 'active'),
  ('HBD_DS_Narmadapuram', 'HBD_DS_Narmadapuram', 'active'),
  ('RTM_DS_Ratlam', 'RTM_DS_Ratlam', 'active'),
  ('MDS_DS_Mandsaur', 'MDS_DS_Mandsaur', 'active'),
  ('GWL_DS_Gwalior', 'GWL_DS_Gwalior', 'active'),
  ('SCL_DS_Silchar', 'SCL_DS_Silchar', 'active'),
  ('BTE_DS_Bharatpur', 'BTE_DS_Bharatpur', 'active'),
  ('UDR_DS_KhedaCircle', 'UDR_DS_KhedaCircle', 'active'),
  ('PTRD_DS_Bhiwadi', 'PTRD_DS_Bhiwadi', 'active'),
  ('Jai_DS_ShastriNagar', 'Jai_DS_ShastriNagar', 'active'),
  ('Jai_DS_KarniVihar', 'Jai_DS_KarniVihar', 'active'),
  ('JDP_DS_MahaveerNagar', 'JDP_DS_MahaveerNagar', 'active'),
  ('KOT_DS_Kota', 'KOT_DS_Kota', 'active'),
  ('ANG_DS_Savedi', 'ANG_DS_Savedi', 'active'),
  ('NGP_DS_Wardhman', 'NGP_DS_Wardhman', 'active'),
  ('KOP_DS_MangalwarPeth', 'KOP_DS_MangalwarPeth', 'active'),
  ('HTK_DS_Sangli', 'HTK_DS_Sangli', 'active'),
  ('AK_DS_Akola', 'AK_DS_Akola', 'active'),
  ('KKDE_DS_Kurukshetra', 'KKDE_DS_Kurukshetra', 'active'),
  ('YJUD_DS_Yamunagar', 'YJUD_DS_Yamunagar', 'active'),
  ('HAR_DS_Panchkula', 'HAR_DS_Panchkula', 'active'),
  ('CBE_DS_Comibatore', 'CBE_DS_Comibatore', 'active'),
  ('COK_DS_Cochin', 'COK_DS_Cochin', 'active'),
  ('MDU_DS_Sellur', 'MDU_DS_Sellur', 'active'),
  ('JHS_DS_Jhansi', 'JHS_DS_Jhansi', 'active'),
  ('CHN_DS_Avadi', 'CHN_DS_Avadi', 'active'),
  ('BLR_DS_JPNagar', 'BLR_DS_JPNagar', 'active'),
  ('BLR_DS_Sarjapur', 'BLR_DS_Sarjapur', 'active'),
  ('Jai_DS_Muralipura', 'Jai_DS_Muralipura', 'active'),
  ('SME_DS_Shivamogga', 'SME_DS_Shivamogga', 'active'),
  ('CHN_DS_Velacherry', 'CHN_DS_Velacherry', 'active'),
  ('CHN_DS_Vadapalani', 'CHN_DS_Vadapalani', 'active'),
  ('CBE_DS_Podanur', 'CBE_DS_Podanur', 'active'),
  ('CBE_DS_Kalapatti', 'CBE_DS_Kalapatti', 'active'),
  ('CTC_DS_Cuttack', 'CTC_DS_Cuttack', 'active'),
  ('CCU_DS_Belgharia', 'CCU_DS_Belgharia', 'active'),
  ('BLR_DS_Kengeri', 'BLR_DS_Kengeri', 'active'),
  ('SFX-YELAHANKA', 'SFX-YELAHANKA', 'active')
on conflict (store_code) do nothing;
