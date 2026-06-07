-- =====================================================================
-- TEK SEFERLİK VERİ DÜZELTME — borc_kalemler.sira null problemi
-- =====================================================================
-- NOT: Bu script daha önce (hesap_id, donem) bazında çalıştırıldıysa,
-- bu güncel sürüm onun YERİNE geçer ve değerleri hesap_id bazında
-- (dönemden bağımsız) yeniden numaralandırır — tekrar çalıştırmak
-- güvenlidir / düzeltici niteliktedir.
--
-- Neden hesap_id bazında (dönem bazında DEĞİL)?
--   "Kişi" hesaplarda kayıtlar dönem filtresi olmadan TEK bir listede
--   gösteriliyor ve sıralama bu birleşik liste üzerinden yönetiliyor.
--   Eğer sira (hesap_id, donem) bazında ayrı ayrı tutulursa, farklı
--   dönemlerden gelen kayıtlar aynı sira değerine sahip olabilir
--   (çakışma) ve birleşik liste sıralaması tutarsız olur. KK hesaplarda
--   zaten dönem filtresi uygulanıyor, bu yüzden hesap genelinde tutulan
--   bir havuz onlar için de sorunsuz çalışır.
--
-- Yeni şema (borc_harcamalar / birikim_hareketler ile aynı mantık):
--   - Yeni eklenen kalem, kendi hesabındaki en büyük sira değerinden bir
--     fazlasını alır (max+1) → en üstte görünür ve mevcut kayıtların
--     hiçbiri update görmez.
--   - Ekranda sira'ya göre BÜYÜKTEN KÜÇÜĞE sıralanır (en yeni en üstte).
--
-- Bu UPDATE, her hesap (hesap_id) için ayrı ayrı, kayıtları tarihe göre
-- (en yeni → en eski) sıralayıp baştan numaralandırır:
--   en yeni kayıt → en yüksek sira (adet-1)
--   en eski kayıt → en düşük sira (0)
-- Hem hiç sira atanmamış (null) hem de farklı şekilde atanmış (örn. eski
-- (hesap_id, donem) bazlı) kayıtlar dahil — tamamı tarihe göre yeniden ve
-- tutarlı şekilde numaralandırılır. Sonuç: ekranda görünen sıralama
-- (tarihe göre en yeni en üstte) korunur, sadece DB'deki sayısal değerler
-- tutarlı, çakışmasız ve null'suz hale gelir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: hangi kayıtların sira değeri nasıl değişecek
-- ---------------------------------------------------------------------
select b.id, b.hesap_id, b.donem, b.tarih, b.sira as eski_sira,
       (count(*) over (partition by b.hesap_id)
         - row_number() over (partition by b.hesap_id order by b.tarih desc)) as yeni_sira
from borc_kalemler b
order by b.hesap_id, b.tarih desc;


-- ---------------------------------------------------------------------
-- 2) GÜNCELLEME — yukarıdaki önizlemeyi inceleyip onayladıktan sonra
--    aşağıdaki bloğu seçip çalıştırın.
-- ---------------------------------------------------------------------

begin;

with sirali as (
  select id,
         (count(*) over (partition by hesap_id)
           - row_number() over (partition by hesap_id order by tarih desc)) as yeni_sira
  from borc_kalemler
)
update borc_kalemler b
set sira = s.yeni_sira
from sirali s
where b.id = s.id;

-- Kontrol — her hesapta en yeni kayıt en yüksek sira'ya sahip olmalı:
-- select hesap_id, id, donem, tarih, sira from borc_kalemler order by hesap_id, sira desc;

commit;
-- Bir şey ters giderse:
-- rollback;
