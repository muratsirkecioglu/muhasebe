export const GIDER_KATEGORILER = [
  'Gıda', 'Kira', 'Akaryakıt', 'Fatura', 'Borç', 'Eşya', 'Sağlık',
  'Giyim', 'Ulaşım', 'Eğitim', 'Eğlence', 'Hediye', 'Aidat',
  'Temizlik M.', 'Burs', 'Birikim', 'Diğer',
]

export const GELIR_TURLERI = [
  'Maaş', 'Prim', 'Yol', 'Masraf', 'Alacak', 'Hediye', 'Kira Geliri', 'Birikim', 'Diğer',
]

export function buDonem() {
  const d = new Date()
  return d.getFullYear() * 100 + (d.getMonth() + 1)
}

// Bir tarih string'inden (YYYY-MM-DD) dönem (YYYYMM) hesaplar
export function tarihtenDonem(tarihStr) {
  const d = new Date(tarihStr)
  if (isNaN(d)) return buDonem()
  return d.getFullYear() * 100 + (d.getMonth() + 1)
}

// Bir Date nesnesini ya da DB'den gelen timestamptz/ISO string'ini,
// YEREL tarihe göre "YYYY-MM-DD" formatına çevirir.
// NOT: `date.toISOString().split('T')[0]` veya `String(iso).split('T')[0]`
// KULLANMAYIN — bunlar UTC'ye göre kestiği için, yerel saat dilimi UTC'den
// ileride olduğunda (örn. Türkiye UTC+3) gece yarısına yakın saatlerdeki
// tarihler bir gün geriye kayar (örn. 01.06.2026 00:00 yerel → DB'de
// 2026-05-31 21:00:00+00 olarak saklanır; ham string'i bölmek "31.05.2026"
// gibi YANLIŞ bir tarih üretir). Bu fonksiyon her zaman `new Date(...)`
// ile parse edip yerel getFullYear/getMonth/getDate kullanır.
export function yerelTarih(deger) {
  if (!deger) return ''
  const d = deger instanceof Date ? deger : new Date(deger)
  if (isNaN(d)) return ''
  const y = d.getFullYear()
  const a = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${a}-${g}`
}

export function donemLabel(donem) {
  const y = Math.floor(donem / 100)
  const m = donem % 100
  return `${y}/${String(m).padStart(2, '0')}`
}

export function formatTarih(tarihStr) {
  if (!tarihStr) return '—'
  const d = new Date(tarihStr)
  if (isNaN(d)) return String(tarihStr)
  const gun = String(d.getDate()).padStart(2, '0')
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const yil = d.getFullYear()
  return `${gun}.${ay}.${yil}`
}

export function formatPara(sayi) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sayi || 0)
}
