-- TEŞHİS (salt okunur): 202601'i kapattıktan SONRA, GERİ ALMADAN ÖNCE çalıştırın.
-- handleKapat'ın donem_kapanislari tablosuna gerçekte ne yazdığını gösterir.
select h.ad, dk.donem, dk.kapani_bakiye
from donem_kapanislari dk
join hesaplar h on h.id = dk.hesap_id
where dk.donem = 202601
order by h.ad;
