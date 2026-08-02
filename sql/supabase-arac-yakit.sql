-- =====================================================================
-- ARAÇ — yakıt tüketimi takibi (km / litre / tam depo)
-- =====================================================================
-- Akaryakıt giderine üç alan eklenir; üçü de yalnızca kategori 'Akaryakıt' ve
-- bir araç seçiliyken doldurulur:
--   km        → dolum anındaki kilometre sayacı (aracın toplam km'si)
--   litre     → o dolumda alınan yakıt
--   tam_depo  → depo tam mı dolduruldu (varsayılan true)
--
-- Tüketim ancak iki TAM DEPO arasında ölçülebilir: aradaki eksik dolumların
-- litreleri o aralığa eklenir. İlk dolumun litresi hiçbir ölçülmüş mesafeye
-- karşılık gelmediği için ortalamaya girmez (standart depo-depo yöntemi).
--
-- Kolonlar arac_id ile aynı üç tabloda durur; KK yolundan gelen dolumlar da
-- ekstre kesilip ödendiğinde bu veriyi hesap_hareketler'e taşır.
-- ÖNEMLİ: bu yüzden odeEkstre artık araca bağlı peşin harcamaları kategori
-- bazında TOPLAMIYOR — her dolum kendi km/litre bilgisiyle ayrı satır oluyor.
-- =====================================================================

alter table hesap_hareketler add column if not exists km integer;
alter table hesap_hareketler add column if not exists litre numeric;
alter table hesap_hareketler add column if not exists tam_depo boolean;

alter table borc_harcamalar add column if not exists km integer;
alter table borc_harcamalar add column if not exists litre numeric;
alter table borc_harcamalar add column if not exists tam_depo boolean;

alter table borc_kalemler add column if not exists km integer;
alter table borc_kalemler add column if not exists litre numeric;
alter table borc_kalemler add column if not exists tam_depo boolean;

-- Kontrol:
-- select arac_id, tarih, km, litre, tam_depo, -tutar as tutar
--   from hesap_hareketler where litre is not null order by arac_id, km;
