-- =====================================================================
-- HESAPLAR — görsel meta verisi (emoji / renk) ekleniyor
-- =====================================================================
-- Amaç: Birikim.jsx'teki hardcoded HESAPLAR dizisi ve TUR_AD_ESLEME eşleme
-- tablosunu tamamen kaldırıp, hesap tanımlarını (emoji/renk dahil) doğrudan
-- `hesaplar` tablosundan okumak — böylece yeni bir birikim/yatırım hesabı
-- eklemek için KOD DEĞİŞİKLİĞİ gerekmez, sadece bu tabloya satır eklemek yeterli olur.
--
-- `renk` kolonu, ekranlarda doğrudan kullanılan Tailwind sınıf string'ini tutar
-- (ör. 'bg-blue-50 border-blue-200 text-blue-800'). `emoji` kolonu kart/liste
-- başlıklarında gösterilen simgedir. İkisi de boşsa ekran taraflı bir varsayılan
-- (VARSAYILAN_EMOJI / VARSAYILAN_RENK) kullanılır.
-- =====================================================================

alter table hesaplar add column if not exists emoji text;
alter table hesaplar add column if not exists renk text;

-- Birikim (TL) kökü
update hesaplar set emoji = '💰', renk = 'bg-blue-50 border-blue-200 text-blue-800'
  where ad = 'Birikim (TL)';

-- Varlık hesapları (tip = 'birikim')
update hesaplar set emoji = '🥇', renk = 'bg-yellow-50 border-yellow-200 text-yellow-800'
  where ad = 'ALT (F)';
update hesaplar set emoji = '🏦', renk = 'bg-amber-50 border-amber-200 text-amber-800'
  where ad = 'ALT (H)';
update hesaplar set emoji = '🪙', renk = 'bg-slate-50 border-slate-200 text-slate-700'
  where ad = 'GMS (H)';
update hesaplar set emoji = '💵', renk = 'bg-green-50 border-green-200 text-green-800'
  where ad = 'USD' and tip = 'birikim';
update hesaplar set emoji = '💶', renk = 'bg-indigo-50 border-indigo-200 text-indigo-800'
  where ad = 'EUR' and tip = 'birikim';
update hesaplar set emoji = '💷', renk = 'bg-purple-50 border-purple-200 text-purple-800'
  where ad = 'GBP' and tip = 'birikim';

-- Yatırım hesapları (tip = 'yatirim')
update hesaplar set emoji = '🏗️', renk = 'bg-orange-50 border-orange-200 text-orange-800'
  where ad = 'İnşaat';
update hesaplar set emoji = '🏢', renk = 'bg-rose-50 border-rose-200 text-rose-800'
  where ad = 'Şirketi Hayriyye';
update hesaplar set emoji = '🏪', renk = 'bg-pink-50 border-pink-200 text-pink-800'
  where ad = 'Palandora';
update hesaplar set emoji = '🔄', renk = 'bg-teal-50 border-teal-200 text-teal-800'
  where ad = 'ALIM-SATIM';
update hesaplar set emoji = '🐄', renk = 'bg-lime-50 border-lime-200 text-lime-800'
  where ad = 'Hayvancılık';

-- Kontrol — Birikim (TL) ve altındaki birikim/yatırım hesaplarının hepsi emoji/renk almış olmalı:
-- select id, ad, tip, doviz_cinsi, emoji, renk, sira from hesaplar
--   where ad = 'Birikim (TL)' or ust_hesap_id = (select id from hesaplar where ad = 'Birikim (TL)')
--   order by sira;
