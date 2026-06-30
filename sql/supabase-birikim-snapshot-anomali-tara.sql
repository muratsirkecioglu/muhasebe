-- TEŞHİS (salt okunur): 202601'de bulunan "Birikim alt hesapları senkron
-- kapanmamışsa bakiye katlanır" hatası, 202601'den ÖNCE kapatılmış başka
-- dönemleri de etkilemiş olabilir. Bu sorgu, Birikim (TL) kökü ve tüm aktif
-- alt hesapları (döviz/altın/yatırım vb.) için ardışık dönemler arasındaki
-- bakiye sıçramalarını listeler — anormal büyük bir artış/azalış varsa hatanın
-- izidir. Sonuçları paylaşın, hangi dönemlerin yeniden kapatılması gerektiğini
-- birlikte belirleyelim.

with birikim_hesaplar as (
  select id, ad from hesaplar where ad = 'Birikim (TL)'
  union all
  select h.id, h.ad from hesaplar h
  join hesaplar kok on kok.ad = 'Birikim (TL)'
  where h.ust_hesap_id = kok.id and h.tip in ('birikim', 'yatirim')
),
snap as (
  select dk.hesap_id, bh.ad, dk.donem, dk.kapani_bakiye,
         lag(dk.kapani_bakiye) over (partition by dk.hesap_id order by dk.donem) as onceki_bakiye,
         lag(dk.donem) over (partition by dk.hesap_id order by dk.donem) as onceki_donem
  from donem_kapanislari dk
  join birikim_hesaplar bh on bh.id = dk.hesap_id
)
select ad, onceki_donem, onceki_bakiye, donem, kapani_bakiye,
       (kapani_bakiye - onceki_bakiye) as fark
from snap
where onceki_bakiye is not null
order by abs(kapani_bakiye - onceki_bakiye) desc
limit 30;

-- Ayrıca: hangi dönemlerde Birikim alt hesapları arasında "senkron olmayan
-- kapanış" durumu var (hatanın tetiklendiği koşul) — bir dönemde bazı
-- hesapların snapshot'ı varken bazılarının yoksa orada risk vardır.
with birikim_hesaplar as (
  select id, ad from hesaplar where ad = 'Birikim (TL)'
  union all
  select h.id, h.ad from hesaplar h
  join hesaplar kok on kok.ad = 'Birikim (TL)'
  where h.ust_hesap_id = kok.id and h.tip in ('birikim', 'yatirim')
)
select dk.donem, count(distinct dk.hesap_id) as kapanan_hesap_sayisi,
       (select count(*) from birikim_hesaplar) as toplam_birikim_hesabi
from donem_kapanislari dk
join birikim_hesaplar bh on bh.id = dk.hesap_id
group by dk.donem
having count(distinct dk.hesap_id) < (select count(*) from birikim_hesaplar)
order by dk.donem;
