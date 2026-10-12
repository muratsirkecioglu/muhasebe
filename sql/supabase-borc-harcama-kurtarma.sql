-- Önceki toplu "ekstre geri al" SQL'i, ekstre_id sütunu eklenmeden ÖNCE kesilmiş
-- ekstrelerin kaynak harcamalarını "bekleyen" durumuna geri çeviremedi (kalemleri
-- sildi ama harcama.ekstre_kesildi=true olarak kalıp görünmez oldu). Hiçbiri gerçek
-- banka kaydına dönüşmediği için bu harcamaları güvenle "bekleyen" yapıp geri getiriyoruz.

update borc_harcamalar
set ekstre_kesildi = false
where harcama_tipi = 'pesin' and ekstre_kesildi = true and ekstre_id is null;
