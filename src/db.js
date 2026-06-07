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
