-- =====================================================================
-- dönem_kapanislari: Aylık dönem kapanış snapshot tablosu
--
-- Her hesap × kapalı dönem için bir satır tutar. Kapalı dönemlerin
-- hesap_hareketler'inden yeniden hesaplanmasını önler — sadece bu
-- tablodaki kapani_bakiye ve dönem gelir/gider toplamları kullanılır.
--
-- Avantaj: tabloya yeni kayıt geldikçe veri büyür ama uygulama her
-- sayfa yüklemesinde sadece "açık dönemlerin" hareketlerini çeker;
-- kapalı dönemler tek satır okumayla karşılanır.
-- =====================================================================

create table if not exists donem_kapanislari (
  id                  uuid primary key default gen_random_uuid(),
  donem               integer not null,          -- YYYYMM (örn. 202401)
  hesap_id            uuid not null references hesaplar(id) on delete cascade,
  kapani_bakiye       numeric not null default 0, -- dönem sonu kümülatif bakiye
  donem_gelir         numeric not null default 0, -- o dönemdeki gelir toplamı
  donem_gider         numeric not null default 0, -- o dönemdeki gider toplamı
  donem_transfer_net  numeric not null default 0, -- o dönemdeki net iç transfer
  hesaplandi_at       timestamptz default now(),
  unique(donem, hesap_id)
);

-- RLS
alter table donem_kapanislari enable row level security;

create policy "Giriş yapmış kullanıcı erişebilir"
  on donem_kapanislari for all
  using (auth.uid() is not null);

-- İndeks: dönem bazlı sorgular için
create index if not exists idx_donem_kapanislari_donem
  on donem_kapanislari(donem);

create index if not exists idx_donem_kapanislari_hesap_donem
  on donem_kapanislari(hesap_id, donem);
