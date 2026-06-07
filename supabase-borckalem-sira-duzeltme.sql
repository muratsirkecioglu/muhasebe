-- =====================================================================
-- TEK SEFERLİK VERİ DÜZELTME — borc_kalemler.sira null problemi
-- =====================================================================
-- Yeni şema (borc_harcamalar / birikim_hareketler ile aynı mantık):
--   - Yeni eklenen kalem, kendi hesabındaki + döneminde (hesap_id, donem)
--     en büyük sira değerinden bir fazlasını alır (max+1) → en üstte
--     görünür ve mevcut kayıtların hiçbiri update görmez.
--   - Ekranda sira'ya göre BÜYÜKTEN KÜÇÜĞE sıralanır (en yeni en üstte).
--
-- Bu UPDATE, her (hesap_id, donem) grubu için ayrı ayrı, kayıtları tarihe
-- göre (en yeni → en eski) sıralayıp baştan numaralandırır:
--   en yeni kayıt → en yüksek sira (adet-1)
--   en eski kayıt → en düşük sira (0)
-- Hem hiç sira atanmamış (null) hem de farklı şekilde atanmış kayıtlar
-- dahil — tamamı tarihe göre yeniden ve tutarlı şekilde numaralandırılır.
-- Sonuç: ekranda görünen sıralama (tarihe göre en yeni en üstte) korunur,
-- sadece DB'deki sayısal değerler tutarlı ve null'suz hale gelir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: hangi kayıtların sira değeri nasıl değişecek
-- ---------------------------------------------------------------------
select b.id, b.hesap_id, b.donem, b.tarih, b.sira as eski_sira,
       (count(*) over (partition by b.hesap_id, b.donem)
         - row_number() over (partition by b.hesap_id, b.donem order by b.tarih desc)) as yeni_sira
from borc_kalemler b
order by b.hesap_id, b.donem, b.tarih desc;


-- ---------------------------------------------------------------------
-- 2) GÜNCELLEME — yukarıdaki önizlemeyi inceleyip onayladıktan sonra
--    aşağıdaki bloğu seçip çalıştırın.
-- ---------------------------------------------------------------------

begin;

with sirali as (
  select id,
         (count(*) over (partition by hesap_id, donem)
           - row_number() over (partition by hesap_id, donem order by tarih desc)) as yeni_sira
  from borc_kalemler
)
update borc_kalemler b
set sira = s.yeni_sira
from sirali s
where b.id = s.id;

-- Kontrol — her (hesap_id, donem) grubunda en yeni kayıt en yüksek sira'ya sahip olmalı:
-- select hesap_id, donem, id, tarih, sira from borc_kalemler order by hesap_id, donem, sira desc;

commit;
-- Bir şey ters giderse:
-- rollback;
