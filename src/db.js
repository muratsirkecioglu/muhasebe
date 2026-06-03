export const GIDER_KATEGORILER = [
  'Gıda', 'Kira', 'Akaryakıt', 'Fatura', 'Borç', 'Eşya', 'Sağlık',
  'Giyim', 'Ulaşım', 'Eğitim', 'Eğlence', 'Hediye', 'Aidat',
  'Temizlik M.', 'Burs', 'Diğer',
]

export const GELIR_TURLERI = [
  'Maaş', 'Prim', 'Yol', 'Masraf', 'Alacak', 'Hediye', 'Kira Geliri', 'Diğer',
]

export function buDonem() {
  const d = new Date()
  return d.getFullYear() * 100 + (d.getMonth() + 1)
}

export function donemLabel(donem) {
  const y = Math.floor(donem / 100)
  const m = donem % 100
  return `${y}/${String(m).padStart(2, '0')}`
}

export function formatPara(sayi) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sayi || 0)
}
