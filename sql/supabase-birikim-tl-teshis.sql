-- TEŞHİS (salt okunur): Birikim (TL) bakiyesi 10.240 civarı olması gerekirken
-- 2.637.477,77 görünüyor. Bu sorgular hesaplamanın hangi parçasının bozuk
-- olduğunu bulmaya yardımcı olur. Sonuçları paylaşın.

-- 1) Birikim (TL) hesabının id'si
select id, ad, doviz_cinsi, ust_hesap_id, tip, aktif
from hesaplar
where ad = 'Birikim (TL)';

-- 2) Bu hesap için en son kapanmış dönem (snapshot)
select donem, kapani_bakiye, donem_gelir, donem_gider, donem_transfer_net
from donem_kapanislari
where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
order by donem desc
limit 5;

-- 3) Açık dönem hareketlerinin SAYISI ve TOPLAMI (uygulamanın yaptığı hesap budur:
--    snapshot.kapani_bakiye + bu toplam = ekranda gösterilen bakiye)
select count(*) as kayit_sayisi, sum(tutar) as toplam_tutar,
       min(tarih) as en_eski, max(tarih) as en_yeni
from hesap_hareketler
where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
  and donem > coalesce(
    (select max(donem) from donem_kapanislari where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')),
    0
  );

-- 4) En büyük 20 hareket (anormal/tek seferlik büyük bir kayıt var mı diye)
select id, tarih, donem, tutar, tur, kategori, aciklama, grup_id, karsi_hesap_id
from hesap_hareketler
where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
order by abs(tutar) desc
limit 20;

-- 5) Aynı grup_id'ye sahip 2'den fazla kayıt var mı (çift kayıt/duplikasyon şüphesi)
select grup_id, count(*) as adet, sum(tutar) as toplam
from hesap_hareketler
where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
  and grup_id is not null
group by grup_id
having count(*) > 2
order by adet desc;

-- 6) donem alanı tarih ile tutarsız mı (yanlış döneme düşmüş kayıt olabilir)
select id, tarih, donem,
       (extract(year from tarih)::int * 100 + extract(month from tarih)::int) as olmasi_gereken_donem,
       tutar, aciklama
from hesap_hareketler
where hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
  and donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
order by tarih desc
limit 20;
