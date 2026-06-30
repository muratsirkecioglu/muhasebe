-- TEŞHİS (salt okunur): Birikim (TL) ve tüm aktif alt hesapların (ALT(H) dahil)
-- TAM kapanış geçmişini, hesap bazında yan yana gösterir. Buradaki amaç: bir
-- hesabın geçmişte hangi dönemde "atlandığını" (snapshot'ı olmadığını) görmek —
-- 202601 kapatılırken oluşan bozulmanın asıl tetikleyicisi muhtemelen budur.
-- Sonuçları TAMAMINI paylaşın (filtre yok, kısa bir liste olmalı).

with birikim_hesaplar as (
  select id, ad from hesaplar where ad = 'Birikim (TL)'
  union all
  select h.id, h.ad from hesaplar h
  join hesaplar kok on kok.ad = 'Birikim (TL)'
  where h.ust_hesap_id = kok.id and h.tip in ('birikim', 'yatirim') and h.aktif = true
)
select bh.ad, dk.donem, dk.kapani_bakiye
from birikim_hesaplar bh
left join donem_kapanislari dk on dk.hesap_id = bh.id
order by bh.ad, dk.donem;

-- Ayrıca: 202601 kapatılmadan hemen önceki (örn. 202512 veya en son neyse)
-- dönemde her hesabın açık (snapshot'lanmamış) hareket toplamı ve hangi
-- önceki snapshot'a göre hesaplandığı:
with birikim_hesaplar as (
  select id, ad from hesaplar where ad = 'Birikim (TL)'
  union all
  select h.id, h.ad from hesaplar h
  join hesaplar kok on kok.ad = 'Birikim (TL)'
  where h.ust_hesap_id = kok.id and h.tip in ('birikim', 'yatirim') and h.aktif = true
),
son_snapshot as (
  select bh.id, bh.ad,
         (select dk.donem from donem_kapanislari dk where dk.hesap_id = bh.id and dk.donem < 202601 order by dk.donem desc limit 1) as onceki_donem,
         (select dk.kapani_bakiye from donem_kapanislari dk where dk.hesap_id = bh.id and dk.donem < 202601 order by dk.donem desc limit 1) as onceki_bakiye
  from birikim_hesaplar bh
)
select s.ad, s.onceki_donem, s.onceki_bakiye,
       (select count(*) from hesap_hareketler hh where hh.hesap_id = s.id and hh.donem <= 202601 and (s.onceki_donem is null or hh.donem > s.onceki_donem)) as hareket_sayisi,
       (select coalesce(sum(hh.tutar),0) from hesap_hareketler hh where hh.hesap_id = s.id and hh.donem <= 202601 and (s.onceki_donem is null or hh.donem > s.onceki_donem)) as hareket_toplami,
       coalesce(s.onceki_bakiye,0) + (select coalesce(sum(hh.tutar),0) from hesap_hareketler hh where hh.hesap_id = s.id and hh.donem <= 202601 and (s.onceki_donem is null or hh.donem > s.onceki_donem)) as olmasi_gereken_202601_bakiye
from son_snapshot s;
