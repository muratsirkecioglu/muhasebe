-- =====================================================================
-- MIGRATION — giderler / gelirler / nk_transferler / birikim_hareketler
--             → hesap_hareketler (yeni birleşik defter)
-- =====================================================================
-- ÖNEMLİ:
--  - Bu script kaynak tabloları SİLMEZ / DEĞİŞTİRMEZ — sadece yeni
--    hesap_hareketler tablosuna kayıt ekler. Kaynaklar, ekranlar yeni
--    mimariye geçirilene kadar olduğu gibi kalmaya devam edecek.
--  - AŞAMALAR sırayla, birbirinden bağımsız begin/commit blokları halinde
--    tasarlandı — her birini çalıştırıp KONTROL sorgusunu inceledikten
--    sonra bir sonrakine geçin.
--  - Script tek seferlik göç içindir, idempotent DEĞİLDİR — bir aşamayı
--    iki kez çalıştırırsanız kayıtlar çiftlenir. Yanlış giderse o aşamanın
--    commit'ine kadar rollback yapıp yeniden deneyebilirsiniz.
--  - AŞAMA 0 sadece OKUMA yapar (tanı amaçlı) — önce onu çalıştırıp
--    sonuçları gözden geçirmeden diğer aşamalara geçmeyin. Özellikle
--    0.4'teki "grupsuz" kayıtların listesini birlikte değerlendirelim;
--    AŞAMA 5 o sonuçlara göre yazılacak (bu script'te henüz YOK).
-- =====================================================================


-- =====================================================================
-- ORTAK NOT — birikim_hareketler.tur (eski metin) → hesaplar.ad (yeni)
-- =====================================================================
-- İsimler birebir aynı değil (boşluk farkları, "Yatırım (..)" kalıbı →
-- düz isim, "Yatırım (Al-Sat)" → "ALIM-SATIM"). Aşağıdaki eşleme script
-- genelinde tekrar tekrar VALUES tablosu olarak kullanılacak:
--
--   eski_tur (birikim_hareketler.tur)   →   yeni_ad (hesaplar.ad)
--   ---------------------------------------------------------------
--   'Birikim (TL)'                      →   'Birikim (TL)'
--   'ALT(F)'                            →   'ALT (F)'
--   'ALT(H)'                            →   'ALT (H)'
--   'GMS(H)'                            →   'GMS (H)'
--   'USD' / 'EUR' / 'GBP'               →   (aynı)
--   'Yatırım (İnşaat)'                  →   'İnşaat'
--   'Yatırım (Şirketi Hayriyye)'        →   'Şirketi Hayriyye'
--   'Yatırım (Palandora)'               →   'Palandora'
--   'Yatırım (Al-Sat)'                  →   'ALIM-SATIM'
--   'Yatırım (Hayvancılık)'             →   'Hayvancılık'
-- =====================================================================


-- #####################################################################
-- AŞAMA 0 — TANI (sadece SELECT — hiçbir şeyi değiştirmez)
-- #####################################################################

-- 0.1) nk_transferler — aynı satırda hem k hem n dolu mu? (beklenmiyor;
--      varsa migration'da iki ayrı bacak çifti üreteceğiz demektir)
select count(*) as hem_k_hem_n_dolu
from nk_transferler
where k <> 0 and n <> 0;

-- 0.2) giderler/gelirler — grup_id'si olup karşılığı birikim_hareketler'de
--      bulunamayan "yetim" kayıt var mı? (varsa AŞAMA 3 öncesi netleştirelim)
select 'giderler' as tablo, count(*) as yetim
from giderler g
where g.grup_id is not null
  and not exists (select 1 from birikim_hareketler b where b.grup_id = g.grup_id)
union all
select 'gelirler', count(*)
from gelirler g
where g.grup_id is not null
  and not exists (select 1 from birikim_hareketler b where b.grup_id = g.grup_id);

-- 0.3) birikim_hareketler — grup_id'lerin sınıf dağılımı:
--      - birikim_ici_cift   : grup_id başka bir birikim_hareketler kaydında da var
--      - gider_gelir_capraz : grup_id bir gider/gelir kaydında var
--      - yetim              : grup_id dolu ama hiçbir eş bulunamadı
--      - grupsuz            : grup_id null (tekli kayıt)
with siniflandirma as (
  select b.id, b.grup_id,
    case
      when b.grup_id is null then 'grupsuz'
      when exists (select 1 from birikim_hareketler b2 where b2.grup_id = b.grup_id and b2.id <> b.id) then 'birikim_ici_cift'
      when exists (select 1 from giderler g where g.grup_id = b.grup_id)
        or exists (select 1 from gelirler ge where ge.grup_id = b.grup_id) then 'gider_gelir_capraz'
      else 'yetim'
    end as sinif
  from birikim_hareketler b
)
select sinif, count(*) as adet
from siniflandirma
group by sinif
order by sinif;

-- 0.4) "grupsuz" (tekli) birikim_hareketler kayıtlarına örnek — bunların ne
--      anlama geldiğini birlikte değerlendirip AŞAMA 5'i buna göre yazacağız
select id, tarih, tur, alt_tip, miktar, islem_tl, kur, aciklama
from birikim_hareketler
where grup_id is null
order by tarih desc
limit 50;

-- 0.5) "yetim" birikim_hareketler kayıtları varsa örnekleri (varsayılan: yok)
select b.id, b.tarih, b.tur, b.alt_tip, b.miktar, b.islem_tl, b.aciklama, b.grup_id
from birikim_hareketler b
where b.grup_id is not null
  and not exists (select 1 from birikim_hareketler b2 where b2.grup_id = b.grup_id and b2.id <> b.id)
  and not exists (select 1 from giderler g where g.grup_id = b.grup_id)
  and not exists (select 1 from gelirler ge where ge.grup_id = b.grup_id)
limit 30;

-- 0.6) giderler/gelirler.hesap kolonu sadece 'K'/'N' mi içeriyor?
select 'giderler' as tablo, hesap, count(*) from giderler group by hesap
union all
select 'gelirler', hesap, count(*) from gelirler group by hesap
order by 1, 2;


-- #####################################################################
-- AŞAMA 1 — nk_transferler → Banka ↔ Nakit transfer çiftleri
-- #####################################################################
-- NOT (kullanıcı kararı): 22 kayıtta hem k hem n dolu — "aynı gün hem
-- nakitten bankaya hem bankadan nakite geçiş" olarak yorumlanıp NETLEŞTİRİLİYOR:
-- farkı (k - n) alınıp yüksek olan tarafa yazılıyor (sonuç bakiyede değişmez).
-- Bu tek formül hem bu 22 özel satırı hem normal (k veya n tek dolu) satırları
-- kapsar:
--   net = k - n
--   net > 0  → nakitten bankaya net akış : Nakit(-net) ↔ Banka(+net)
--   net < 0  → bankadan nakite net akış  : Banka(-|net|) ↔ Nakit(+|net|)
--   net = 0  → birbirini götürür, gerçek bir transfer yok → atlanır

-- 1) ÖNİZLEME
select id, tarih, donem, k, n, (k - n) as net,
       case when (k - n) > 0 then 'Nakit(-) ↔ Banka(+)'
            when (k - n) < 0 then 'Banka(-) ↔ Nakit(+)'
            else 'NET SIFIR — atlanacak' end as yon
from nk_transferler
order by tarih desc;

-- 2) GÖÇ
begin;

with net as (
  select id as kaynak_id, gen_random_uuid() as grup_id,
         tarih, donem, (k - n) as net_tutar, aciklama, created_at
  from nk_transferler
  where k <> n
),
hesap_id_nakit as (select id from hesaplar where ad = 'Nakit'),
hesap_id_banka as (select id from hesaplar where ad = 'Banka')
insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, aciklama, created_at)
-- "kaynak" bacağı — azalan taraf (net>0: Nakit azalır, net<0: Banka azalır)
select
  case when net_tutar > 0 then (select id from hesap_id_nakit) else (select id from hesap_id_banka) end,
  case when net_tutar > 0 then (select id from hesap_id_banka) else (select id from hesap_id_nakit) end,
  grup_id, tarih, donem, -abs(net_tutar), 'transfer', 'Nakit/Banka Transferi', aciklama, created_at
from net
union all
-- "hedef" bacağı — artan taraf (net>0: Banka artar, net<0: Nakit artar)
select
  case when net_tutar > 0 then (select id from hesap_id_banka) else (select id from hesap_id_nakit) end,
  case when net_tutar > 0 then (select id from hesap_id_nakit) else (select id from hesap_id_banka) end,
  grup_id, tarih, donem, abs(net_tutar), 'transfer', 'Nakit/Banka Transferi', aciklama, created_at
from net;

-- KONTROL — (k<>n olan) kaynak satır sayısı × 2 = eklenen kayıt sayısı olmalı,
-- ve her grup_id tam 2 satırda görünüp toplamı 0 olmalı:
-- select (select count(*) from nk_transferler where k <> n) * 2 as beklenen,
--        (select count(*) from hesap_hareketler where kategori = 'Nakit/Banka Transferi') as gerceklesen;
-- select grup_id, count(*) adet, sum(tutar) toplam from hesap_hareketler
--   where kategori = 'Nakit/Banka Transferi' group by grup_id having count(*) <> 2 or sum(tutar) <> 0;

commit;
-- rollback;


-- #####################################################################
-- AŞAMA 2 — giderler / gelirler (grup_id YOK) → tekli gider/gelir kaydı
-- #####################################################################
-- hesap: 'K' → Banka, 'N' → Nakit
-- gider → tutar = -k (bakiye azalır) / gelir → tutar = +k (bakiye artar)
-- gelirler.tur kolonu kategori bilgisini taşıyor (ada rağmen "tur" değil)

-- 1) ÖNİZLEME
select 'gider' as kaynak, id, tarih, donem, hesap, kategori, k, -k as yeni_tutar
from giderler where grup_id is null
union all
select 'gelir', id, tarih, donem, hesap, tur as kategori, k, k as yeni_tutar
from gelirler where grup_id is null
order by tarih desc
limit 50;

-- 2) GÖÇ
begin;

insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, aciklama, created_at)
select
  (select id from hesaplar where ad = case when g.hesap = 'N' then 'Nakit' else 'Banka' end),
  null::bigint, null::uuid,
  g.tarih, g.donem, -g.k, 'gider', g.kategori, g.aciklama, g.created_at
from giderler g
where g.grup_id is null
union all
select
  (select id from hesaplar where ad = case when ge.hesap = 'N' then 'Nakit' else 'Banka' end),
  null::bigint, null::uuid,
  ge.tarih, ge.donem, ge.k, 'gelir', ge.tur, ge.aciklama, ge.created_at
from gelirler ge
where ge.grup_id is null;

-- KONTROL:
-- select (select count(*) from giderler where grup_id is null)
--      + (select count(*) from gelirler where grup_id is null) as beklenen,
--        (select count(*) from hesap_hareketler where tur in ('gider','gelir') and karsi_hesap_id is null) as gerceklesen;

commit;
-- rollback;


-- #####################################################################
-- AŞAMA 3 — giderler/gelirler (grup_id VAR, "Birikim" çapraz bağlantı)
--           → Banka/Nakit ↔ Birikim (TL) transfer çifti
-- #####################################################################
-- Kaynakta: gider/gelir kaydı (grup_id=X) + birikim_hareketler kaydı
-- (tur='Birikim (TL)', grup_id=X, miktar=±tutar) zaten birbirine bağlı.
-- Yeni modelde bunu tek bir transfer ÇİFTİ olarak taşıyoruz, orijinal
-- grup_id'yi KORUYORUZ (izlenebilirlik + tekrar-çalıştırma kontrolü için).

-- 1) ÖNİZLEME
select 'gider' as kaynak, g.id, g.tarih, g.grup_id, g.hesap, g.k as gider_tutar,
       b.miktar as birikim_miktar, b.aciklama as birikim_aciklama
from giderler g
join birikim_hareketler b on b.grup_id = g.grup_id and b.tur = 'Birikim (TL)'
where g.grup_id is not null
union all
select 'gelir', ge.id, ge.tarih, ge.grup_id, ge.hesap, ge.k,
       b.miktar, b.aciklama
from gelirler ge
join birikim_hareketler b on b.grup_id = ge.grup_id and b.tur = 'Birikim (TL)'
where ge.grup_id is not null
order by tarih desc;

-- 2) GÖÇ
begin;

insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, aciklama, created_at)
-- Banka/Nakit bacağı (gider → azalır, gelir → artar)
select
  (select id from hesaplar where ad = case when g.hesap = 'N' then 'Nakit' else 'Banka' end),
  (select id from hesaplar where ad = 'Birikim (TL)'),
  g.grup_id, g.tarih, g.donem, -g.k, 'transfer', 'Birikime Transfer', g.aciklama, g.created_at
from giderler g
where g.grup_id is not null
  and exists (select 1 from birikim_hareketler b where b.grup_id = g.grup_id and b.tur = 'Birikim (TL)')
union all
select
  (select id from hesaplar where ad = case when ge.hesap = 'N' then 'Nakit' else 'Banka' end),
  (select id from hesaplar where ad = 'Birikim (TL)'),
  ge.grup_id, ge.tarih, ge.donem, ge.k, 'transfer', 'Birikimden Transfer', ge.aciklama, ge.created_at
from gelirler ge
where ge.grup_id is not null
  and exists (select 1 from birikim_hareketler b where b.grup_id = ge.grup_id and b.tur = 'Birikim (TL)')
union all
-- Birikim (TL) bacağı — gider/gelir farketmeksizin, eşleşen birikim_hareketler kaydındaki
-- işaretli miktarı doğrudan kullanıyoruz (zaten doğru yönde: gider→+, gelir→-)
select
  (select id from hesaplar where ad = 'Birikim (TL)'),
  (select id from hesaplar where ad = case when src.hesap = 'N' then 'Nakit' else 'Banka' end),
  b.grup_id, b.tarih,
  (extract(year from b.tarih)::int * 100 + extract(month from b.tarih)::int),
  b.miktar, 'transfer',
  case when src.kaynak = 'gider' then 'Birikime Transfer' else 'Birikimden Transfer' end,
  b.aciklama, b.created_at
from birikim_hareketler b
join lateral (
  select 'gider'::text as kaynak, hesap, donem from giderler g where g.grup_id = b.grup_id
  union all
  select 'gelir'::text, hesap, donem from gelirler ge where ge.grup_id = b.grup_id
) src on true
where b.tur = 'Birikim (TL)'
  and b.grup_id is not null
  and exists (
    select 1 from giderler g2 where g2.grup_id = b.grup_id
    union all
    select 1 from gelirler ge2 where ge2.grup_id = b.grup_id
  );

-- KONTROL — her grup_id'de tam 2 satır ve toplam TL tutarı yaklaşık 0 olmalı
-- (farklı hesap birimleri olmadığından burada tam simetrik olmalı):
-- select grup_id, count(*) adet, sum(tutar) toplam from hesap_hareketler
--   where kategori in ('Birikime Transfer','Birikimden Transfer')
--   group by grup_id having count(*) <> 2 or sum(tutar) <> 0;

commit;
-- rollback;


-- #####################################################################
-- AŞAMA 4 — birikim_hareketler İÇİ çiftler (iki birikim_hareketler kaydı
--           aynı grup_id ile birbirine bağlı) → transfer çifti
-- #####################################################################
-- Örn: "İnşaat" hesabına 5000 TL çıkış ↔ "Birikim (TL)" -5000 TL
--      "ALT (H)" alışı ↔ "Birikim (TL)" karşı kaydı (ters yönlü)
-- Orijinal grup_id korunuyor. tur/alt_tip → hesaplar.ad eşlemesi yukarıdaki
-- ORTAK NOT'taki tabloyla yapılıyor.

with tur_eslesme(eski_tur, yeni_ad) as (
  values
    ('Birikim (TL)', 'Birikim (TL)'),
    ('ALT(F)', 'ALT (F)'),
    ('ALT(H)', 'ALT (H)'),
    ('GMS(H)', 'GMS (H)'),
    ('USD', 'USD'),
    ('EUR', 'EUR'),
    ('GBP', 'GBP'),
    ('Yatırım (İnşaat)', 'İnşaat'),
    ('Yatırım (Şirketi Hayriyye)', 'Şirketi Hayriyye'),
    ('Yatırım (Palandora)', 'Palandora'),
    ('Yatırım (Al-Sat)', 'ALIM-SATIM'),
    ('Yatırım (Hayvancılık)', 'Hayvancılık')
)
-- 1) ÖNİZLEME — eşlemenin herşeyi kapsadığını doğrulayın (sonuç boş dönmeli)
select distinct b.tur
from birikim_hareketler b
where b.grup_id is not null
  and exists (select 1 from birikim_hareketler b2 where b2.grup_id = b.grup_id and b2.id <> b.id)
  and not exists (select 1 from tur_eslesme te where te.eski_tur = b.tur);

-- 2) GÖÇ
begin;

with tur_eslesme(eski_tur, yeni_ad) as (
  values
    ('Birikim (TL)', 'Birikim (TL)'),
    ('ALT(F)', 'ALT (F)'),
    ('ALT(H)', 'ALT (H)'),
    ('GMS(H)', 'GMS (H)'),
    ('USD', 'USD'),
    ('EUR', 'EUR'),
    ('GBP', 'GBP'),
    ('Yatırım (İnşaat)', 'İnşaat'),
    ('Yatırım (Şirketi Hayriyye)', 'Şirketi Hayriyye'),
    ('Yatırım (Palandora)', 'Palandora'),
    ('Yatırım (Al-Sat)', 'ALIM-SATIM'),
    ('Yatırım (Hayvancılık)', 'Hayvancılık')
),
cift as (
  select b.id, b.grup_id, b.tarih, b.tur, b.alt_tip, b.miktar, b.islem_tl, b.kur, b.aciklama, b.created_at,
         h.id as hesap_id,
         -- karşı bacağın hesap_id'si: aynı grup_id'li diğer kayıt
         (select h2.id
            from birikim_hareketler b2
            join tur_eslesme te2 on te2.eski_tur = b2.tur
            join hesaplar h2 on h2.ad = te2.yeni_ad
           where b2.grup_id = b.grup_id and b2.id <> b.id
           limit 1) as karsi_hesap_id
  from birikim_hareketler b
  join tur_eslesme te on te.eski_tur = b.tur
  join hesaplar h on h.ad = te.yeni_ad
  where b.grup_id is not null
    and exists (select 1 from birikim_hareketler b2 where b2.grup_id = b.grup_id and b2.id <> b.id)
)
insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, kur, islem_tl, aciklama, created_at)
select
  hesap_id, karsi_hesap_id, grup_id, tarih,
  (extract(year from tarih)::int * 100 + extract(month from tarih)::int),
  miktar, 'transfer', alt_tip, kur, islem_tl, aciklama, created_at
from cift;

-- KONTROL — kaynak çift sayısı × ... = eklenen kayıt sayısı, her grup_id 2 satır:
-- select (select count(*) from birikim_hareketler b where b.grup_id is not null
--           and exists (select 1 from birikim_hareketler b2 where b2.grup_id=b.grup_id and b2.id<>b.id)) as beklenen,
--        (select count(*) from hesap_hareketler where tur='transfer' and kategori in
--          (select distinct alt_tip from birikim_hareketler where alt_tip is not null)) as gerceklesen_yaklasik;
-- select grup_id, count(*) from hesap_hareketler hh
--   where exists (select 1 from birikim_hareketler b where b.grup_id = hh.grup_id)
--   group by grup_id having count(*) <> 2;

commit;
-- rollback;


-- #####################################################################
-- AŞAMA 5 — birikim_hareketler "grupsuz" + "yetim" kayıtlar
--           → tek bacaklı transfer kaydı (karşı hesap bilinmiyor)
-- #####################################################################
-- Kullanıcı kararı: bu kayıtlar (örn. "yatırıma gelen" / "yatırım hesabından
-- çekilen" açıklamalı, eskiden Ana Hesap ↔ Birikim arası elle girilmiş ve hiç
-- grup_id ile eşlenmemiş kayıtlar; ayrıca "yetim" — bir zamanlar çifti olup
-- karşı tarafı silinmiş kayıtlar) ARTIK eşleştirilmeden, KARŞI HESABI
-- belirtilmeden tek bacaklı "transfer" olarak taşınacak:
--   - tur            = 'transfer'  (gerçek bir gider/gelir değil, hesaplar
--                                    arası para hareketi — raporları bozmasın)
--   - karsi_hesap_id = null
--   - grup_id        = null        (yetim kayıtların eski grup_id'si artık
--                                    hiçbir yerde eşleşmeyeceği için anlamsız;
--                                    temiz bir başlangıç için null bırakılıyor)
--   - tutar          = miktar (işaretiyle birlikte korunuyor)
--   - kategori       = alt_tip (varsa) — orijinal bağlam korunsun diye
--
-- "birikim_ici_cift" (1412 kayıt, AŞAMA 4'te taşındı) bu kapsamın dışında.

with tur_eslesme(eski_tur, yeni_ad) as (
  values
    ('Birikim (TL)', 'Birikim (TL)'),
    ('ALT(F)', 'ALT (F)'),
    ('ALT(H)', 'ALT (H)'),
    ('GMS(H)', 'GMS (H)'),
    ('USD', 'USD'),
    ('EUR', 'EUR'),
    ('GBP', 'GBP'),
    ('Yatırım (İnşaat)', 'İnşaat'),
    ('Yatırım (Şirketi Hayriyye)', 'Şirketi Hayriyye'),
    ('Yatırım (Palandora)', 'Palandora'),
    ('Yatırım (Al-Sat)', 'ALIM-SATIM'),
    ('Yatırım (Hayvancılık)', 'Hayvancılık')
)
-- 1) ÖNİZLEME — taşınacak kayıtlar ve hedef hesapları
select b.id, b.tarih, b.tur as eski_tur, h.ad as yeni_hesap, b.alt_tip, b.miktar, b.aciklama,
       case
         when b.grup_id is null then 'grupsuz'
         else 'yetim'
       end as kaynak_sinif
from birikim_hareketler b
join tur_eslesme te on te.eski_tur = b.tur
join hesaplar h on h.ad = te.yeni_ad
where not exists (select 1 from birikim_hareketler b2 where b.grup_id is not null and b2.grup_id = b.grup_id and b2.id <> b.id)
order by b.tarih desc;

-- 2) GÖÇ
begin;

with tur_eslesme(eski_tur, yeni_ad) as (
  values
    ('Birikim (TL)', 'Birikim (TL)'),
    ('ALT(F)', 'ALT (F)'),
    ('ALT(H)', 'ALT (H)'),
    ('GMS(H)', 'GMS (H)'),
    ('USD', 'USD'),
    ('EUR', 'EUR'),
    ('GBP', 'GBP'),
    ('Yatırım (İnşaat)', 'İnşaat'),
    ('Yatırım (Şirketi Hayriyye)', 'Şirketi Hayriyye'),
    ('Yatırım (Palandora)', 'Palandora'),
    ('Yatırım (Al-Sat)', 'ALIM-SATIM'),
    ('Yatırım (Hayvancılık)', 'Hayvancılık')
)
insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, kur, islem_tl, aciklama, created_at)
select
  h.id, null::bigint, null::uuid,
  b.tarih,
  (extract(year from b.tarih)::int * 100 + extract(month from b.tarih)::int),
  b.miktar, 'transfer', b.alt_tip, b.kur, b.islem_tl, b.aciklama, b.created_at
from birikim_hareketler b
join tur_eslesme te on te.eski_tur = b.tur
join hesaplar h on h.ad = te.yeni_ad
where not exists (select 1 from birikim_hareketler b2 where b.grup_id is not null and b2.grup_id = b.grup_id and b2.id <> b.id);

-- KONTROL — taşınan kayıt sayısı, "grupsuz + yetim" toplamına eşit olmalı (130 + 138 = 268):
-- select count(*) from hesap_hareketler
--   where tur = 'transfer' and karsi_hesap_id is null and grup_id is null
--   and kategori is distinct from 'Nakit/Banka Transferi';

commit;
-- rollback;


-- #####################################################################
-- AŞAMA 6 — borc_kalemler (SADECE "kişi" tipi hesaplar) → hesap_hareketler
-- #####################################################################
-- Kaynak: borc_kalemler + borc_hesaplar (tip='kisi'). "kk" (kredi kartı)
-- hesapları KAPSAM DIŞI — kullanıcı kararıyla yeni mimariye dahil edilmiyor.
-- Kişi hesaplarında SADECE 'al'/'ode' türleri var; grup_id, odendi,
-- taksit_no/taksit_toplam, kategori alanları kullanılmıyor (hepsi null/false/0).
-- İsimler (borc_hesaplar.ad ↔ hesaplar.ad, tip='borc') BİREBİR eşleşiyor —
-- doğrudan ad üzerinden join yapılabiliyor, ayrı bir eşleme tablosu gerekmiyor.
--
-- İŞARET DÖNÜŞÜMÜ (kullanıcı kararı): yeni modelde 'borc' tipi hesabın
-- bakiyesi pozitifken "bana borçlular" (alacak/varlık) anlamına gelmeli.
-- Eski modelde ise pozitif bakiye "ben onlara borçluyum" demekti
-- (al → tutar=+T, ode → tutar=-T). Bu TAM TERS bir yorum olduğundan işaret
-- negatifleniyor — basitçe:
--     yeni_tutar = -eski_tutar
-- (al: eski +T → yeni -T  ::  ode: eski -T → yeni +T)
--
-- karsi_hesap_id / grup_id: kaynakta karşı taraf bilgisi (hangi Banka/Nakit
-- hareketiyle ilişkili olduğu) tutulmuyor — AŞAMA 5'teki gibi tek bacaklı
-- "transfer" kaydı olarak taşınıyor (gider/gelir değil — bunlar kasadan
-- kişiye / kişiden kasaya para hareketi, raporları bozmasın diye 'transfer').

-- 0) ÖN-KONTROL — kişi hesaplarında 'al'/'ode' DIŞINDA tur, ya da
--    taksit_no/taksit_toplam/kategori dolu kayıt var mı? (boş dönmeli)
select bk.tur, count(*) as adet,
       count(*) filter (where bk.taksit_no is not null) as taksit_no_dolu,
       count(*) filter (where bk.taksit_toplam is not null) as taksit_toplam_dolu,
       count(*) filter (where bk.kategori is not null) as kategori_dolu,
       count(*) filter (where bk.grup_id is not null) as grup_id_dolu,
       count(*) filter (where bk.odendi is true) as odendi_true
from borc_kalemler bk
join borc_hesaplar bh on bh.id = bk.hesap_id
where bh.tip = 'kisi'
group by bk.tur;

-- 1) ÖNİZLEME
select bh.ad, h.id as yeni_hesap_id, bk.tarih, bk.donem, bk.tur,
       bk.tutar as eski_tutar, -bk.tutar as yeni_tutar, bk.aciklama
from borc_kalemler bk
join borc_hesaplar bh on bh.id = bk.hesap_id
join hesaplar h on h.ad = bh.ad and h.tip = 'borc'
where bh.tip = 'kisi'
order by bk.tarih desc;

-- 2) GÖÇ
begin;

insert into hesap_hareketler
  (hesap_id, karsi_hesap_id, grup_id, tarih, donem, tutar, tur, kategori, aciklama, created_at)
select
  h.id, null::bigint, null::uuid,
  bk.tarih, bk.donem, -bk.tutar, 'transfer',
  case when bk.tur = 'al' then 'Borç Alındı' else 'Borç Ödendi' end,
  bk.aciklama, bk.created_at
from borc_kalemler bk
join borc_hesaplar bh on bh.id = bk.hesap_id
join hesaplar h on h.ad = bh.ad and h.tip = 'borc'
where bh.tip = 'kisi';

-- KONTROL — (a) sayı eşleşmeli, (b) hesap bazında işaret-çevrilmiş toplamlar eşleşmeli:
-- select
--   (select count(*) from borc_kalemler bk join borc_hesaplar bh on bh.id = bk.hesap_id where bh.tip = 'kisi') as beklenen,
--   (select count(*) from hesap_hareketler hh join hesaplar h on h.id = hh.hesap_id where h.tip = 'borc') as gerceklesen;
--
-- select h.ad,
--   (select coalesce(sum(-bk.tutar), 0) from borc_kalemler bk
--      join borc_hesaplar bh on bh.id = bk.hesap_id
--      where bh.ad = h.ad and bh.tip = 'kisi') as kaynak_toplam_yeni_isaretle,
--   (select coalesce(sum(hh.tutar), 0) from hesap_hareketler hh where hh.hesap_id = h.id) as hedef_toplam
-- from hesaplar h
-- where h.tip = 'borc'
-- order by h.ad;

commit;
-- rollback;


-- #####################################################################
-- GENEL SON KONTROL — tüm kaynakların toplam satır sayısı ile
-- hesap_hareketler'e eklenen toplam satır sayısını karşılaştırın
-- #####################################################################
-- select
--   (select count(*) from nk_transferler where k <> n) * 2                                    as asama1_beklenen,
--   (select count(*) from giderler where grup_id is null) + (select count(*) from gelirler where grup_id is null) as asama2_beklenen,
--   -- asama3 muhtemelen 0 (gider_gelir_capraz sınıfı boş çıktı)
--   1412                                                                                       as asama4_beklenen,
--   268                                                                                        as asama5_beklenen,
--   (select count(*) from hesap_hareketler)                                                    as toplam_eklenen;
