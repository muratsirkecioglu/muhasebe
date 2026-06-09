-- =====================================================================
-- Toplu dönem kapanışı — belirtilen dönem aralığını otomatik kapatır
--
-- KULLANIM:
--   1. Alttaki ARRAY'i kapatılacak dönemlerle doldur (YYYYMM formatı)
--   2. Çalıştırmadan önce bir önceki dönemin kapalı olduğundan emin ol
--   3. Çalıştır — NOTICE mesajları her dönemin bakiyesini gösterir
--   4. Hesap sayfasını yenile ve değerleri kontrol et
--
-- ÖNEMLİ: Script idempotent (ON CONFLICT DO UPDATE) — tekrar çalıştırılsa
-- aynı sonucu üretir, mevcut kayıtları günceller, yeni satır eklemez.
-- =====================================================================

DO $$
DECLARE
  v_banka_id    bigint;
  v_nakit_id    bigint;
  v_birikim_id  bigint;
  v_donem       int;

  v_gelir_banka        numeric;
  v_gider_banka        numeric;
  v_transfer_net_banka numeric;
  v_gelir_nakit        numeric;
  v_gider_nakit        numeric;

  v_prev_banka   numeric;
  v_prev_nakit   numeric;
  v_kapani_banka numeric;
  v_kapani_nakit numeric;

  v_hesap_id     bigint;
  v_prev_birikim numeric;
  v_donem_artis  numeric;

BEGIN
  SELECT id INTO v_banka_id   FROM hesaplar WHERE ad = 'Banka';
  SELECT id INTO v_nakit_id   FROM hesaplar WHERE ad = 'Nakit';
  SELECT id INTO v_birikim_id FROM hesaplar WHERE ad = 'Birikim (TL)';

  -- ▼▼▼ Kapatılacak dönemleri buraya yaz ▼▼▼
  FOREACH v_donem IN ARRAY ARRAY[201705,201706,201707,201708,201709,201710,201711,201712]
  LOOP
    RAISE NOTICE '── Dönem kapatılıyor: %', v_donem;

    -- Önceki snapshot bakiyeleri
    SELECT COALESCE(kapani_bakiye, 0) INTO v_prev_banka
    FROM donem_kapanislari WHERE hesap_id = v_banka_id AND donem < v_donem
    ORDER BY donem DESC LIMIT 1;

    SELECT COALESCE(kapani_bakiye, 0) INTO v_prev_nakit
    FROM donem_kapanislari WHERE hesap_id = v_nakit_id AND donem < v_donem
    ORDER BY donem DESC LIMIT 1;

    -- Banka: dönem gelir / gider / transfer net
    -- Birikim kategorili transferler → gelir/gider gibi sayılır (K/N havuzundan gerçek çıkış/giriş)
    -- Banka↔Nakit iç transferler    → transferNet (imzalı, Banka bacağından)
    SELECT
      COALESCE(SUM(CASE
        WHEN tur = 'gelir' THEN tutar
        WHEN tur = 'transfer' AND karsi_hesap_id = v_birikim_id AND tutar > 0 THEN tutar
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN tur = 'gider' THEN -tutar
        WHEN tur = 'transfer' AND karsi_hesap_id = v_birikim_id AND tutar < 0 THEN -tutar
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN tur = 'transfer' AND (karsi_hesap_id IS DISTINCT FROM v_birikim_id) THEN tutar
        ELSE 0 END), 0)
    INTO v_gelir_banka, v_gider_banka, v_transfer_net_banka
    FROM hesap_hareketler
    WHERE hesap_id = v_banka_id AND donem = v_donem;

    -- Nakit: dönem gelir / gider
    -- transferNet → Banka bacağından alınır (simetrik olduğu için)
    SELECT
      COALESCE(SUM(CASE
        WHEN tur = 'gelir' THEN tutar
        WHEN tur = 'transfer' AND karsi_hesap_id = v_birikim_id AND tutar > 0 THEN tutar
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN tur = 'gider' THEN -tutar
        WHEN tur = 'transfer' AND karsi_hesap_id = v_birikim_id AND tutar < 0 THEN -tutar
        ELSE 0 END), 0)
    INTO v_gelir_nakit, v_gider_nakit
    FROM hesap_hareketler
    WHERE hesap_id = v_nakit_id AND donem = v_donem;

    v_kapani_banka := v_prev_banka + v_gelir_banka - v_gider_banka + v_transfer_net_banka;
    v_kapani_nakit := v_prev_nakit + v_gelir_nakit - v_gider_nakit - v_transfer_net_banka;

    INSERT INTO donem_kapanislari
      (donem, hesap_id, kapani_bakiye, donem_gelir, donem_gider, donem_transfer_net)
    VALUES
      (v_donem, v_banka_id, v_kapani_banka, v_gelir_banka, v_gider_banka, v_transfer_net_banka),
      (v_donem, v_nakit_id, v_kapani_nakit, v_gelir_nakit, v_gider_nakit, 0)
    ON CONFLICT (donem, hesap_id) DO UPDATE SET
      kapani_bakiye      = EXCLUDED.kapani_bakiye,
      donem_gelir        = EXCLUDED.donem_gelir,
      donem_gider        = EXCLUDED.donem_gider,
      donem_transfer_net = EXCLUDED.donem_transfer_net,
      hesaplandi_at      = now();

    RAISE NOTICE '   Banka kapanış: %  |  Nakit kapanış: %', v_kapani_banka, v_kapani_nakit;

    -- Birikim (TL) kök + aktif alt hesaplar
    FOR v_hesap_id IN
      SELECT id FROM hesaplar WHERE id = v_birikim_id AND aktif = true
      UNION ALL
      SELECT id FROM hesaplar
      WHERE ust_hesap_id = v_birikim_id
        AND tip IN ('birikim', 'yatirim')
        AND aktif = true
    LOOP
      SELECT COALESCE(kapani_bakiye, 0) INTO v_prev_birikim
      FROM donem_kapanislari WHERE hesap_id = v_hesap_id AND donem < v_donem
      ORDER BY donem DESC LIMIT 1;

      SELECT COALESCE(SUM(tutar), 0) INTO v_donem_artis
      FROM hesap_hareketler
      WHERE hesap_id = v_hesap_id AND donem = v_donem;

      INSERT INTO donem_kapanislari
        (donem, hesap_id, kapani_bakiye, donem_gelir, donem_gider, donem_transfer_net)
      VALUES
        (v_donem, v_hesap_id, v_prev_birikim + v_donem_artis, 0, 0, 0)
      ON CONFLICT (donem, hesap_id) DO UPDATE SET
        kapani_bakiye = EXCLUDED.kapani_bakiye,
        hesaplandi_at = now();
    END LOOP;

  END LOOP;

  RAISE NOTICE '✓ Tüm dönemler kapatıldı.';
END $$;
