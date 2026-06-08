-- =====================================================================
-- DİKKAT — BU SCRIPT SADECE KOZMETİK BİR DEĞİŞİKLİK YAPAR
-- =====================================================================
-- Arka plan: `tarih` sütunları `timestamptz` (UTC) olarak saklanıyor.
-- Türkiye UTC+3 olduğu için, yerel gece yarısına ait bir tarih
-- (örn. "01.06.2026 00:00 yerel") DB'de "2026-05-31 21:00:00+00"
-- olarak görünür. Bu DOĞRU bir UTC temsilidir — bir hata değildir —
-- ve uygulama (yerelTarih düzeltmesinden sonra) bunu zaten doğru
-- şekilde "01.06.2026" olarak gösteriyor.
--
-- Bu script, sırf Supabase panelinde / ham sorgularda UTC değerinin
-- "normal" görünmesi için tüm `tarih` değerlerine +3 saat ekler.
-- Uygulamanın davranışını DEĞİŞTİRMEZ (yerel tarih aynı kalır).
--
-- RİSK: Eğer bir kayıtta gerçek saat bilgisi varsa ve yerel saat
-- 21:00–23:59 aralığındaysa, +3 saat eklemek günü bir sonraki güne
-- kaydırabilir. Bunu önlemek için aşağıdaki UPDATE, sadece "kaydırma
-- sonrası yerel takvim günü DEĞİŞMEYEN" satırları günceller — riskli
-- satırlar dokunulmadan kalır ve ayrıca raporlanır.
--
-- GERİ ALINAMAZ bir toplu UPDATE'tir. Önce SELECT'lerle kontrol edin.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: birkaç örnek satırda tarih, +3 saat sonrası hâli ve
--    yerel takvim gününün değişip değişmediği
-- ---------------------------------------------------------------------
select id, tarih,
       tarih + interval '3 hour' as yeni_tarih,
       (date_trunc('day', tarih at time zone 'Europe/Istanbul')
         = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul')) as gun_degismiyor
from giderler
order by tarih desc
limit 20;


-- ---------------------------------------------------------------------
-- 2) GÜVENLİ OLMAYAN SATIRLARI BUL (varsa) — bunlara DOKUNULMAYACAK
--    "gun_degismiyor = false" olan satırlar +3 saatle güne taşar.
-- ---------------------------------------------------------------------
select 'giderler' as tablo, id, tarih, tarih + interval '3 hour' as yeni_tarih
from giderler
where date_trunc('day', tarih at time zone 'Europe/Istanbul')
   <> date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul')
union all
select 'gelirler', id, tarih, tarih + interval '3 hour'
from gelirler
where date_trunc('day', tarih at time zone 'Europe/Istanbul')
   <> date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul')
union all
select 'nk_transferler', id, tarih, tarih + interval '3 hour'
from nk_transferler
where date_trunc('day', tarih at time zone 'Europe/Istanbul')
   <> date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul')
union all
select 'birikim_hareketler', id, tarih, tarih + interval '3 hour'
from birikim_hareketler
where date_trunc('day', tarih at time zone 'Europe/Istanbul')
   <> date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul')
union all
select 'borc_hareketler', id, tarih, tarih + interval '3 hour'
from borc_hareketler
where tarih is not null
  and date_trunc('day', tarih at time zone 'Europe/Istanbul')
   <> date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- Bu sorgu boş dönerse: hiçbir kaydın yerel takvim günü değişmeyecek,
-- +3 saat kaydırma tamamen güvenli demektir.
-- Eğer satır dönerse: o satırların gerçek saat bilgisi var demektir;
-- aşağıdaki UPDATE bunlara dokunmaz (güvenlik şartı sayesinde), ama
-- isterseniz bunları elle inceleyip ayrı karar verebilirsiniz.


-- =====================================================================
-- 3) GÜNCELLEME — yalnızca yerel takvim günü değişmeyecek satırlarda
--    +3 saat ekler. Yukarıdaki önizlemeyi inceleyip onayladıktan
--    sonra aşağıdaki blogu seçip çalıştırın.
-- =====================================================================

-- begin;

-- update giderler
-- set tarih = tarih + interval '3 hour'
-- where date_trunc('day', tarih at time zone 'Europe/Istanbul')
--     = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- update gelirler
-- set tarih = tarih + interval '3 hour'
-- where date_trunc('day', tarih at time zone 'Europe/Istanbul')
--     = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- update nk_transferler
-- set tarih = tarih + interval '3 hour'
-- where date_trunc('day', tarih at time zone 'Europe/Istanbul')
--     = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- update birikim_hareketler
-- set tarih = tarih + interval '3 hour'
-- where date_trunc('day', tarih at time zone 'Europe/Istanbul')
--     = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- update borc_hareketler
-- set tarih = tarih + interval '3 hour'
-- where tarih is not null
--   and date_trunc('day', tarih at time zone 'Europe/Istanbul')
--     = date_trunc('day', (tarih + interval '3 hour') at time zone 'Europe/Istanbul');

-- Sonuçları kontrol edin, sorun yoksa:
-- commit;
-- Bir şey ters giderse:
-- rollback;
