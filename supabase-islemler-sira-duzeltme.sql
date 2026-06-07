-- =====================================================================
-- TEK SEFERLİK VERİ DÜZELTME — giderler / gelirler.sira null problemi
-- =====================================================================
-- İşlemler ekranı, giderler + gelirler kayıtlarını dönem bazında TEK bir
-- birleşik liste halinde gösterip sıralamayı bu birleşik liste üzerinden
-- yönetiyor. Bu yüzden sira değerleri de iki tablo için ORTAK bir havuzdan
-- (aynı dönem içinde çakışmayacak şekilde) gelmeli:
--   - Yeni eklenen kayıt, o dönemde HER İKİ tabloda görülen en büyük sira
--     değerinden bir fazlasını alır (max+1) → en üstte görünür, mevcut
--     kayıtlar update görmez.
--   - Ekranda sira'ya göre BÜYÜKTEN KÜÇÜĞE sıralanır (en yeni en üstte).
--
-- Bu script, giderler+gelirler'i dönem bazında birleştirip tarihe göre
-- (en yeni → en eski) sıralayıp baştan numaralandırır, sonra her tabloya
-- kendi payını geri yazar. Geçici bir tabloya ihtiyaç var çünkü tek bir
-- CTE iki ayrı UPDATE'te yeniden kullanılamıyor.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: hangi kayıtların sira değeri nasıl değişecek
-- ---------------------------------------------------------------------
with birlesik as (
  select id, 'giderler'::text as tablo, donem, tarih, sira as eski_sira from giderler
  union all
  select id, 'gelirler'::text as tablo, donem, tarih, sira as eski_sira from gelirler
)
select tablo, id, donem, tarih, eski_sira,
       (count(*) over (partition by donem)
         - row_number() over (partition by donem order by tarih desc)) as yeni_sira
from birlesik
order by donem, tarih desc;


-- ---------------------------------------------------------------------
-- 2) GÜNCELLEME — yukarıdaki önizlemeyi inceleyip onayladıktan sonra
--    aşağıdaki bloğu seçip çalıştırın.
-- ---------------------------------------------------------------------

begin;

create temporary table _islem_sira_gecici on commit drop as
with birlesik as (
  select id, 'giderler'::text as tablo, donem, tarih from giderler
  union all
  select id, 'gelirler'::text as tablo, donem, tarih from gelirler
)
select id, tablo,
       (count(*) over (partition by donem)
         - row_number() over (partition by donem order by tarih desc)) as yeni_sira
from birlesik;

update giderler g
set sira = t.yeni_sira
from _islem_sira_gecici t
where t.tablo = 'giderler' and g.id = t.id;

update gelirler g
set sira = t.yeni_sira
from _islem_sira_gecici t
where t.tablo = 'gelirler' and g.id = t.id;

-- Kontrol — her dönemde en yeni kayıt en yüksek sira'ya sahip olmalı ve
-- iki tablo arasında aynı dönemde çakışan sira değeri olmamalı:
-- select 'gider' k, donem, id, tarih, sira from giderler
-- union all
-- select 'gelir' k, donem, id, tarih, sira from gelirler
-- order by donem, sira desc;

commit;
-- Bir şey ters giderse:
-- rollback;
