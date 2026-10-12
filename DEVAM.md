# Devam Notları

Oturum devri için durum özeti. Son güncelleme: 2026-10-12.

## Kurulum

```bash
git clone https://github.com/muratsirkecioglu/muhasebe.git
cd muhasebe
npm install
npm run dev
```

Supabase anahtarı `src/supabase.js` içinde gömülü (publishable key) — kopyalanacak
`.env` yok.

## Deploy kuralı

Sadece `master`'a push edilir; GitHub Actions oradan otomatik yayına alır.
**`npm run deploy` çalıştırılmaz, `gh-pages` branch'ine push edilmez.**

## Supabase şeması

Şema değişiklikleri repoda `sql/supabase-*.sql` olarak durur ama **otomatik
uygulanmaz** — Supabase SQL Editor'de elle çalıştırılır. Veritabanı tek bir bulut
örneği olduğu için bu makineden bağımsızdır; bir kez çalıştırıldıysa tekrar gerekmez.

| Script | İçerik | Durum |
|---|---|---|
| `sql/supabase-arac.sql` | `araclar` tablosu + `hesap_hareketler`/`borc_harcamalar`/`borc_kalemler` → `arac_id` | ✅ 2026-10-12'de uygulandı |
| `sql/supabase-arac-yakit.sql` | Aynı üç tabloya `km`, `litre`, `tam_depo` | ✅ 2026-10-12'de uygulandı |

Yeni bir script eklenirse `if not exists` ile tekrar çalıştırılabilir yazılmalı ve
bu tabloya durumuyla birlikte işlenmeli.

## Son çalışma: Araç takibi

Araçlar hesap sisteminden bağımsız (`hesaplar` ağacında yok, bakiyesi yok, dönem
kapanışına girmez). Tek işlevi gider etiketlemek.

- **Araç sayfası** (`/arac`): araç ekle, satıldı işaretle (pasife çek), geri al.
  İki sekme — aylık gider tablosu ve yakıt tüketimi.
- **Araç kategorileri** (`ARAC_KATEGORILER`, db.js): Akaryakıt, Ulaşım, Vergi, HGS.
  Bu kategoriler seçilince gider formlarında araç seçici çıkar.
- **Yakıt** (`YAKIT_KATEGORI` = Akaryakıt): km / litre / tam depo alanları.
  Tüketim depo-depo yöntemiyle hesaplanır (`db.js/yakitTuketimi`) — eksik dolumlar
  bir sonraki tam depoya birikir, ilk dolumun litresi ortalamaya girmez.
- **Geçmiş Giderleri Ata**: araç bağı olmayan araç-kategorili giderleri dönem
  filtresi olmadan tek listede toplar; çoklu seçim + sahiplik dönemine göre seçim.
- **Böl**: tek bir gider satırını parçalara ayırır (ör. bir Ulaşım giderini iki
  araca). Orijinal satır korunur, tutarı güncellenir; kalanlar yeni satır olur.
  Toplam değişmediği için bakiye ve dönem kapanışları etkilenmez.

## Mimari tuzaklar

1. **Supabase 1000 satır limiti.** Satır sayısı zamanla büyüyebilen hiçbir sorgu
   sayfalamasız yazılmaz — sonuç hatasız biçimde SESSİZCE kesilir. `tumunuCek()`
   yardımcısı kullanılır (Hesap.jsx, Birikim.jsx, Islemler.jsx, Arac.jsx'te mevcut).
   Bu, Birikim bakiyesini milyonlara çıkaran gerçek bir hataya yol açmıştı.

2. **`hesap_hareketler.tarih` `timestamptz`.** Oraya `"YYYY-MM-DD"` string'i
   yazılmaz — sunucu oturum saat dilimine göre yeniden yorumlar, gün geriye kayar.
   JS `Date` nesnesi gönderilir (`efektifTarihObj()`); supabase-js `toISOString()`
   ile açık UTC ofseti üretir. `date` tipli sütunlarda (`odendi_tarih`) string güvenli.

3. **Efektif dönem.** Ayın son iş günü, bir sonraki dönemin ilk günü gibi yorumlanır
   (maaş o gün yatıyor). `efektifDonem()` / `efektifTarih()` / `efektifTarihObj()`.
   Dönem combo'ları ve ödeme tarihleri bunu kullanır.

4. **KK zinciri ve çift sayma.** Bir harcama şu yolu izler:
   `borc_harcamalar` → (ekstre kesilir) → `borc_kalemler` → (ödenir) → `hesap_hareketler`.
   Bir kalem deftere YALNIZCA `odeEkstre` üzerinden geçer ve o yol hep `ekstre_id`
   ile yürür. Yani "zaten defterde olanlar" tam olarak `odendi` **ve** `ekstre_id`
   dolu olanlardır — sadece `odendi` filtresi kullanılırsa elle ödendi işaretlenen
   kalemler hiçbir kovaya girmez. (Bkz. `Arac.jsx/yukle`.)

5. **Ekstre ödemesinde dönem.** Banka çıkışının `donem`'i yazılan tarihten türetilir
   (`tarihtenDonem(odemeTarihi)`), kartın ekstre döneminden değil — ikisi ayrışınca
   kayıt, tarihinin ait olmadığı dönemin listesinde görünüyordu.

6. **Araca bağlı peşin harcamalar toplanmaz.** `odeEkstre` araçsız harcamaları
   kategori bazında tek satıra indirir, araca bağlı olanları tek tek yazar — aksi
   halde her dolumun kendi km/litre ölçümü kaybolurdu.

## Açık konular

- **Geçmiş Giderleri Ata** ve **Böl** ekranları yalnızca `hesap_hareketler` üzerinde
  çalışır. Henüz ödenmemiş KK harcamalarının araç bağı, Borç/Alacak sayfasındaki
  harcama formundan kurulur.
- **Araç raporunda ay kayması:** kartla alınan yakıt, ödenmeden önce harcama
  tarihinin ayında, ödendikten sonra ödeme ayında görünür. Toplamlar doğru, sadece
  hangi aya düştüğü değişir. İstenirse rapor `donem` yerine kaydın kendi tarihine
  göre gruplanabilir.
- **Tarayıcı testi yapılmadı.** Araç/yakıt özelliklerinin tamamı yalnızca `npm run
  build` ile doğrulandı; Supabase girişi gerektiği için UI fiilen çalıştırılmadı.
