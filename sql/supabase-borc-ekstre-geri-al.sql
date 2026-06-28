-- "Geri Al": bekleyen (henüz ödenmemiş) bir ekstreyi kesilmeden önceki haline
-- döndürebilmek için borc_harcamalar'ın da hangi ekstreden geldiğini bilmesi gerekiyor.
alter table borc_harcamalar add column if not exists ekstre_id bigint references borc_ekstreler(id) on delete set null;
