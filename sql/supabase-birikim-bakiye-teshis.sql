-- =====================================================================
-- TEŞHİS — Birikim (TL) bakiyesinin yanlış görünmesinin olası nedeni:
-- AŞAMA 3 ve AŞAMA 5'in aynı "Birikim" gider/gelir karşı-kayıtlarını
-- mükerrer taşımış olma ihtimali (bkz. supabase-hesap-hareketler-migration.sql)
-- =====================================================================
-- Mantık: AŞAMA 3, "Birikim" kategorili gider/gelir ↔ Birikim (TL) çiftlerini
-- (grup_id + karsi_hesap_id dolu, kategori='Birikime Transfer'/'Birikimden Transfer')
-- taşıdı. AŞAMA 5 ise birikim_hareketler içinde EŞİ OLMAYAN kayıtları "yetim"
-- sayıp tekrar taşıdı — ama AŞAMA 3'ün zaten taşıdığı bu kayıtların eşi
-- birikim_hareketler'de değil giderler/gelirler'deydi, dolayısıyla AŞAMA 5
-- onları da "yetim" sanıp İKİNCİ KEZ eklemiş olabilir (karsi_hesap_id=NULL,
-- grup_id=NULL, tek bacaklı).
--
-- Bu sorgu, Birikim (TL) hesabında AYNI tarih + AYNI tutar ile hem "eşli"
-- (grup_id dolu, kategori='Birikime Transfer'/'Birikimden Transfer') hem de
-- "tek bacaklı" (grup_id NULL, karsi_hesap_id NULL) kayıt bulunan çiftleri listeler.
-- Sonuç boş DEĞİLSE → mükerrer taşıma doğrulanmış olur.
-- =====================================================================

select
  esli.id   as eslli_id,   esli.tarih, esli.tutar, esli.grup_id, esli.kategori, esli.aciklama,
  tek.id    as tek_bacakli_id, tek.tutar as tek_tutar, tek.kategori as tek_kategori, tek.aciklama as tek_aciklama
from hesap_hareketler esli
join hesap_hareketler tek
  on tek.hesap_id = esli.hesap_id
  and tek.tarih   = esli.tarih
  and tek.tutar   = esli.tutar
  and tek.id     <> esli.id
where esli.hesap_id   = (select id from hesaplar where ad = 'Birikim (TL)')
  and esli.grup_id is not null
  and esli.karsi_hesap_id is not null
  and esli.kategori in ('Birikime Transfer', 'Birikimden Transfer')
  and tek.grup_id is null
  and tek.karsi_hesap_id is null
order by esli.tarih desc;

-- Toplam mükerrer adedi ve bunların Birikim (TL) bakiyesine toplam etkisi:
-- (Bu tutar kadar bakiye şişmiş/yanlış görünüyor olmalı)
select count(*) as mukerrer_cift_sayisi, sum(tek.tutar) as toplam_fazladan_etki
from hesap_hareketler esli
join hesap_hareketler tek
  on tek.hesap_id = esli.hesap_id
  and tek.tarih   = esli.tarih
  and tek.tutar   = esli.tutar
  and tek.id     <> esli.id
where esli.hesap_id   = (select id from hesaplar where ad = 'Birikim (TL)')
  and esli.grup_id is not null
  and esli.karsi_hesap_id is not null
  and esli.kategori in ('Birikime Transfer', 'Birikimden Transfer')
  and tek.grup_id is null
  and tek.karsi_hesap_id is null;

-- Karşılaştırma — eski birikim_hareketler'deki 'Birikim (TL)' toplamı ile
-- yeni hesap_hareketler'deki Birikim (TL) toplamı arasındaki fark:
select
  (select coalesce(sum(miktar), 0) from birikim_hareketler where tur = 'Birikim (TL)') as eski_toplam,
  (select coalesce(sum(tutar), 0) from hesap_hareketler
     where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')) as yeni_toplam;
