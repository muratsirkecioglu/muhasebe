-- =====================================================================
-- TEK SEFERLİK VERİ DÜZELTME — borc_harcamalar.sira yönü değişiyor
-- =====================================================================
-- Eski şema: yeni "tek çekim / peşin" harcama sira=0 (en küçük) alıyordu,
--            ekranda küçükten büyüğe sıralanıyordu (yeni kayıt en üstte).
--            Bu, her yeni kayıt eklendiğinde LİSTEDEKİ TÜM satırların
--            sira değerinin update edilmesine sebep oluyordu.
--
-- Yeni şema: yeni kayıt artık o hesaptaki en büyük sira değerinden bir
--            fazlasını alacak (max+1), ekranda büyükten küçüğe
--            sıralanacak (yeni kayıt yine en üstte görünür) — ama bu
--            sefer SADECE yeni satır insert edilir, mevcut satırlara
--            dokunulmaz.
--
-- Bu UPDATE, yön değişikliğine geçerken MEVCUT kayıtların ekrandaki
-- görsel sırasının (en yeni en üstte) BOZULMAMASI için sira değerlerini
-- her hesap (hesap_id) için ayrı ayrı ters çevirip yeniden numaralandırır:
--   eski: yeni kayıt sira=0, ..., en eski kayıt sira=N-1
--   yeni: en eski kayıt sira=0, ..., en yeni kayıt sira=N-1
-- Sonuç: ekranda görünen sıralama AYNI kalır, sadece DB'deki sayısal
-- değerlerin yönü değişir.
--
-- Sadece "tek çekim" (harcama_tipi='pesin') ve henüz ekstresi
-- kesilmemiş (ekstre_kesildi=false) kayıtlar etkilenir — uygulama da
-- sira sıralamasını yalnızca bu kayıtlar için kullanıyor.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ÖNİZLEME: hangi kayıtların sira değeri nasıl değişecek
-- ---------------------------------------------------------------------
select b.id, b.hesap_id, b.aciklama, b.tutar, b.sira as eski_sira,
       (row_number() over (partition by b.hesap_id order by b.sira desc) - 1) as yeni_sira
from borc_harcamalar b
where b.harcama_tipi = 'pesin' and b.ekstre_kesildi = false
order by b.hesap_id, eski_sira;


-- ---------------------------------------------------------------------
-- 2) GÜNCELLEME — yukarıdaki önizlemeyi inceleyip onayladıktan sonra
--    aşağıdaki bloğu seçip çalıştırın.
-- ---------------------------------------------------------------------

begin;

with sirali as (
  select id,
         (row_number() over (partition by hesap_id order by sira desc) - 1) as yeni_sira
  from borc_harcamalar
  where harcama_tipi = 'pesin' and ekstre_kesildi = false
)
update borc_harcamalar b
set sira = s.yeni_sira
from sirali s
where b.id = s.id;

-- Kontrol — her hesapta en yeni kayıt en yüksek sira değerine sahip olmalı:
-- select hesap_id, id, aciklama, sira from borc_harcamalar
-- where harcama_tipi = 'pesin' and ekstre_kesildi = false
-- order by hesap_id, sira desc;

commit;
-- Bir şey ters giderse:
-- rollback;
