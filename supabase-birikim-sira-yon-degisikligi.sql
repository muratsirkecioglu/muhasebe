-- =====================================================================
-- TEK SEFERLİK VERİ DÜZELTME — birikim_hareketler.sira yönü değişiyor
-- =====================================================================
-- Yeni şema (borc_harcamalar'daki "tek çekim" değişikliğiyle aynı mantık):
--   - Yeni eklenen işlem, kendi hesabındaki (tur) en büyük sira
--     değerinden bir fazlasını alır (max+1) → en üstte görünür ve
--     mevcut kayıtların hiçbiri update görmez.
--   - Ekranda sira'ya göre BÜYÜKTEN KÜÇÜĞE sıralanır (en yeni en üstte).
--
-- Bu UPDATE, her hesap (tur) için ayrı ayrı, kayıtları tarihe göre
-- (en yeni → en eski) sıralayıp baştan numaralandırır:
--   en yeni kayıt → en yüksek sira (adet-1)
--   en eski kayıt → en düşük sira (0)
-- Hem daha önce hiç sira atanmamış (null) hem de eski şemaya göre
-- (yeni=düşük) atanmış kayıtlar dahil — tamamı tarihe göre yeniden
-- ve tutarlı şekilde numaralandırılır. Sonuç: ekranda görünen sıralama
-- (tarihe göre en yeni en üstte) korunur, sadece DB'deki sayısal
-- değerlerin yönü/tutarlılığı düzelir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: hangi kayıtların sira değeri nasıl değişecek
-- ---------------------------------------------------------------------
select b.id, b.tur, b.tarih, b.sira as eski_sira,
       (count(*) over (partition by b.tur)
         - row_number() over (partition by b.tur order by b.tarih desc)) as yeni_sira
from birikim_hareketler b
order by b.tur, b.tarih desc;


-- ---------------------------------------------------------------------
-- 2) GÜNCELLEME — yukarıdaki önizlemeyi inceleyip onayladıktan sonra
--    aşağıdaki bloğu seçip çalıştırın.
-- ---------------------------------------------------------------------

begin;

with sirali as (
  select id,
         (count(*) over (partition by tur)
           - row_number() over (partition by tur order by tarih desc)) as yeni_sira
  from birikim_hareketler
)
update birikim_hareketler b
set sira = s.yeni_sira
from sirali s
where b.id = s.id;

-- Kontrol — her hesapta en yeni kayıt en yüksek sira değerine sahip olmalı:
-- select tur, id, tarih, sira from birikim_hareketler order by tur, sira desc;

commit;
-- Bir şey ters giderse:
-- rollback;
