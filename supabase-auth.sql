-- Eski politikaları sil
drop policy if exists "Herkes okuyabilir" on giderler;
drop policy if exists "Herkes okuyabilir" on gelirler;
drop policy if exists "Herkes okuyabilir" on birikimler;
drop policy if exists "Herkes okuyabilir" on borc_alacak;

-- Sadece giriş yapmış kullanıcılar erişebilir
create policy "Sadece giris yapanlar" on giderler
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Sadece giris yapanlar" on gelirler
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Sadece giris yapanlar" on birikimler
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Sadece giris yapanlar" on borc_alacak
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
