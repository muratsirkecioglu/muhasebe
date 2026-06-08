-- donem alani tarih ile tutarsiz olan satirlari bulur ve (istege bagli) duzeltir.
-- Arka plan: Islemler.jsx'teki bug, donem'i secili UI filtresinden alip kaydediyordu;
-- dogrusu tarihtenDonem(tarih) = YEAR(tarih)*100 + MONTH(tarih) olmali (bkz. src/db.js).

-- 1) Ozet: kac satir tutarsiz?
select 'giderler' as tablo, count(*) as tutarsiz_sayisi
from giderler
where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
union all
select 'gelirler' as tablo, count(*) as tutarsiz_sayisi
from gelirler
where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int);

-- 2) Ornek satirlar (her tablodan ilk 50): mevcut donem vs. tarih'ten hesaplanan donem
select id, tarih, donem as mevcut_donem,
       (extract(year from tarih)::int * 100 + extract(month from tarih)::int) as olmasi_gereken_donem,
       kategori, k, aciklama
from giderler
where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
order by tarih desc
limit 50;

select id, tarih, donem as mevcut_donem,
       (extract(year from tarih)::int * 100 + extract(month from tarih)::int) as olmasi_gereken_donem,
       tur, k, aciklama
from gelirler
where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
order by tarih desc
limit 50;


-- =====================================================================
-- DUZELTME (UPDATE) - sadece yukaridaki raporu inceleyip onayladiktan
-- sonra, asagidaki iki blogu manuel olarak secip calistirin.
-- Bu sorgular FINANSAL VERIYI DEGISTIRIR; geri alinamaz, dikkatli olun.
-- =====================================================================

-- update giderler
-- set donem = (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
-- where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int);

-- update gelirler
-- set donem = (extract(year from tarih)::int * 100 + extract(month from tarih)::int)
-- where donem is distinct from (extract(year from tarih)::int * 100 + extract(month from tarih)::int);
