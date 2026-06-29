-- Günlük kur/altın/gümüş fiyatlarını önbelleğe alır; aynı gün için dış API'ye
-- tekrar tekrar gidilmesini önler. Sayfa yüklenirken bugünün satırı yoksa bir
-- kereliğine çekilip buraya yazılır; "Güncel Kur Al" butonu zorla yeniden çeker.
create table kur_gecmisi (
  tarih date primary key,
  usd numeric,
  eur numeric,
  gbp numeric,
  alt numeric,
  gms numeric,
  guncellenme timestamptz not null default now()
);

alter table kur_gecmisi enable row level security;

create policy "Sadece giris yapanlar" on kur_gecmisi
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
