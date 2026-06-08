-- =====================================================================
-- TEMİZLİK — eski "kişi" tipi borc_hesaplar kayıtlarının kaldırılması
-- =====================================================================
-- BorcAlacak.jsx artık "kişi" hesaplarını borc_hesaplar yerine doğrudan
-- hesaplar (tip='borc') tablosundan okuyup yazıyor (kullanıcı kararı: Option A
-- — kişi hesap master kayıtları tamamen hesaplar'a taşındı, borc_hesaplar
-- bundan böyle SADECE kredi kartı (tip='kk') hesapları için kullanılacak).
--
-- AŞAMA 6 migrasyonu (supabase-hesap-hareketler-migration.sql) zaten
-- borc_kalemler verisini isim eşleştirmesiyle hesap_hareketler'e taşımıştı;
-- ancak borc_hesaplar'daki "kisi" tipi master kayıtlar o sırada silinmemişti.
-- Bu script onları (ve artık kullanılmayan borc_kalemler satırlarını) temizler.
--
-- DİKKAT: Çalıştırmadan önce uygulamanın yeni mimariyle (hesaplar/hesap_hareketler)
-- doğru çalıştığını doğrulayın — bu işlem geri alınamaz.
-- =====================================================================

-- 1) Kontrol — silinecek kayıtları gözden geçirin:
-- select id, ad, tip, doviz_cinsi, aktif from borc_hesaplar where tip = 'kisi';
-- select bk.* from borc_kalemler bk
--   join borc_hesaplar bh on bh.id = bk.hesap_id
--   where bh.tip = 'kisi';

-- 2) Eski kişi hareketlerini sil (hesap_hareketler'e zaten taşındı)
delete from borc_kalemler
where hesap_id in (select id from borc_hesaplar where tip = 'kisi');

-- 3) Eski kişi master kayıtlarını sil (hesaplar'a zaten taşındı)
delete from borc_hesaplar
where tip = 'kisi';

-- Kontrol — borc_hesaplar artık sadece 'kk' tipinde kayıtlar içermeli:
-- select distinct tip from borc_hesaplar;
