-- TEK SEFERLİK: Henüz ödenmemiş TÜM ekstreleri kesilmeden önceki haline döndürür.
-- (geriAlEkstre fonksiyonunun toplu/SQL hali)

-- 1. Peşin harcamalardan oluşturulan kalemleri sil
delete from borc_kalemler
where ekstre_id in (select id from borc_ekstreler where odendi = false)
  and tur = 'ekstre';

-- 2. Taksitli kalemleri ekstre bağından çöz (taksit olarak bekleyen kalır)
update borc_kalemler
set ekstre_id = null
where ekstre_id in (select id from borc_ekstreler where odendi = false);

-- 3. Kaynak peşin harcamaları tekrar bekleyen yap
update borc_harcamalar
set ekstre_kesildi = false, ekstre_id = null
where ekstre_id in (select id from borc_ekstreler where odendi = false);

-- 4. Ödenmemiş ekstre kayıtlarını sil
delete from borc_ekstreler where odendi = false;
