import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabase'
import { Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'

// --- Yardımcı fonksiyonlar ---
function parseTarih(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (!d) return null
    return new Date(d.y, d.m - 1, d.d)
  }
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
    const d = new Date(val)
    return isNaN(d) ? null : d
  }
  return null
}

function donemHesapla(tarih) {
  if (!tarih) return null
  return tarih.getFullYear() * 100 + tarih.getMonth() + 1
}

function sayi(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const s = String(val).replace(/,/g, '').trim()
  if (/^\([\d.]+\)$/.test(s)) return -(parseFloat(s.slice(1, -1)) || 0)
  return parseFloat(s) || 0
}

function hucreOku(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })
  const cell = ws[addr]
  if (!cell) return null
  if (cell.t === 'n') {
    if (cell.w && /^\(/.test(cell.w.trim())) return -Math.abs(cell.v)
    return cell.v
  }
  return cell.v
}

// --- Import fonksiyonları ---
async function importGiderDetay(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const kayitlar = []
  for (let i = 1; i < rows.length; i++) {
    const [tarihVal, kategori, kVal, nVal, , aciklama, donemVal] = rows[i]
    if (!tarihVal || !kategori) continue
    const tarih = parseTarih(tarihVal)
    if (!tarih) continue
    const kTutar = sayi(kVal)
    const nTutar = sayi(nVal)
    if (kTutar === 0 && nTutar === 0) continue
    const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
    const base = { tarih: tarih.toISOString(), donem, kategori: String(kategori), aciklama: aciklama ? String(aciklama) : '' }
    if (kTutar !== 0) kayitlar.push({ ...base, k: kTutar, hesap: 'K' })
    if (nTutar !== 0) kayitlar.push({ ...base, k: nTutar, hesap: 'N' })
  }
  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('giderler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

async function importGelirDetay(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const kayitlar = []
  for (let i = 1; i < rows.length; i++) {
    const [tarihVal, tur, kVal, nVal, aciklama, donemVal] = rows[i]
    if (!tarihVal || !tur) continue
    const tarih = parseTarih(tarihVal)
    if (!tarih) continue
    const kTutar = sayi(kVal)
    const nTutar = sayi(nVal)
    if (kTutar === 0 && nTutar === 0) continue
    const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
    const base = { tarih: tarih.toISOString(), donem, tur: String(tur), aciklama: aciklama ? String(aciklama) : '' }
    if (kTutar !== 0) kayitlar.push({ ...base, k: kTutar, hesap: 'K' })
    if (nTutar !== 0) kayitlar.push({ ...base, k: nTutar, hesap: 'N' })
  }
  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('gelirler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

async function importNK(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const kayitlar = []
  for (let i = 1; i < rows.length; i++) {
    const [tarihVal, kVal, nVal, donemVal] = rows[i]
    if (!tarihVal) continue
    const tarih = parseTarih(tarihVal)
    if (!tarih) continue
    const k = sayi(kVal), n = sayi(nVal)
    if (k === 0 && n === 0) continue
    const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
    kayitlar.push({ tarih: tarih.toISOString(), donem, k, n })
  }
  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('nk_transferler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

async function importBirikim(ws) {
  const kayitlar = []
  const sonSatir = ws['!ref'] ? parseInt(ws['!ref'].split(':')[1].replace(/[A-Z]/g, '')) : 1011
  const h = (r, c) => hucreOku(ws, r, c)

  for (let r = 18; r <= sonSatir; r++) {
    const tlTarih = parseTarih(h(r, 1))
    const tlTutar = sayi(h(r, 2))
    if (tlTarih && tlTutar !== 0) kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Birikim', miktar: tlTutar, islem_tl: tlTutar, kur: 1 })
    const kiraFark = sayi(h(r, 3))
    if (tlTarih && kiraFark !== 0) kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Kira Fark', miktar: kiraFark, islem_tl: kiraFark, kur: 1 })
    const kusurat = sayi(h(r, 4))
    if (tlTarih && kusurat !== 0) kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Küsürat', miktar: kusurat, islem_tl: kusurat, kur: 1 })

    const altinTarih = parseTarih(h(r, 5)) || tlTarih
    const altinGram = sayi(h(r, 6)), altinTL = sayi(h(r, 7)), altinKur = sayi(h(r, 8))
    if (altinTarih && altinGram !== 0) kayitlar.push({ tarih: altinTarih.toISOString(), tur: 'Altın', alt_tip: altinGram > 0 ? 'Alış' : 'Satış', miktar: altinGram, islem_tl: altinTL, kur: altinKur })

    const gmsGram = sayi(h(r, 15)), gmsTL = sayi(h(r, 16)), gmsKur = sayi(h(r, 17))
    if (tlTarih && gmsGram !== 0) kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'GMS/Gümüş', alt_tip: gmsGram > 0 ? 'Alış' : 'Satış', miktar: gmsGram, islem_tl: gmsTL, kur: gmsKur || null })

    const insaatTarih = parseTarih(h(r, 19)), insaatTip = h(r, 20), insaatTL = sayi(h(r, 21))
    if (insaatTarih && insaatTarih.getFullYear() < 2100 && insaatTL !== 0) kayitlar.push({ tarih: insaatTarih.toISOString(), tur: 'İnşaat', alt_tip: insaatTip ? String(insaatTip) : null, miktar: insaatTL, islem_tl: insaatTL })

    const sirketTarih = parseTarih(h(r, 22)), sirketTL = sayi(h(r, 23))
    if (sirketTarih && sirketTarih.getFullYear() > 2000 && sirketTarih.getFullYear() < 2100 && sirketTL !== 0) kayitlar.push({ tarih: sirketTarih.toISOString(), tur: 'Şirketi Hayriyye', miktar: sirketTL, islem_tl: sirketTL })

    const palandoraTarih = parseTarih(h(r, 25)), palandoraTL = sayi(h(r, 26)), palandoraAciklama = h(r, 27)
    if (palandoraTarih && palandoraTarih.getFullYear() < 2100 && palandoraTL !== 0) kayitlar.push({ tarih: palandoraTarih.toISOString(), tur: 'Palandora', miktar: palandoraTL, islem_tl: palandoraTL, aciklama: palandoraAciklama ? String(palandoraAciklama) : null })

    const usdTarih = parseTarih(h(r, 29)), usdMiktar = sayi(h(r, 30)), usdTL = sayi(h(r, 31)), usdKur = sayi(h(r, 32))
    if (usdTarih && usdMiktar !== 0) kayitlar.push({ tarih: usdTarih.toISOString(), tur: 'USD', alt_tip: usdMiktar > 0 ? 'Alış' : 'Satış', miktar: usdMiktar, islem_tl: usdTL, kur: usdKur })

    const eurTarih = parseTarih(h(r, 40)), eurMiktar = sayi(h(r, 41)), eurTL = sayi(h(r, 42)), eurKur = sayi(h(r, 43))
    if (eurTarih && eurMiktar !== 0) kayitlar.push({ tarih: eurTarih.toISOString(), tur: 'EUR', alt_tip: eurMiktar > 0 ? 'Alış' : 'Satış', miktar: eurMiktar, islem_tl: eurTL, kur: eurKur })

    const gbpTarih = parseTarih(h(r, 45)), gbpMiktar = sayi(h(r, 46)), gbpTL = sayi(h(r, 47)), gbpKur = sayi(h(r, 48))
    if (gbpTarih && gbpMiktar !== 0) kayitlar.push({ tarih: gbpTarih.toISOString(), tur: 'GBP', alt_tip: gbpMiktar > 0 ? 'Alış' : 'Satış', miktar: gbpMiktar, islem_tl: gbpTL, kur: gbpKur })

    const buyukbasTarih = parseTarih(h(r, 54)), buyukbasTL = sayi(h(r, 55)), buyukbasAciklama = h(r, 56)
    if (buyukbasTarih && buyukbasTarih.getFullYear() > 2000 && buyukbasTL !== 0) kayitlar.push({ tarih: buyukbasTarih.toISOString(), tur: 'Büyükbaş Hayvan', miktar: buyukbasTL, islem_tl: buyukbasTL, aciklama: buyukbasAciklama ? String(buyukbasAciklama) : null })

    const sirketTarih2 = parseTarih(h(r, 22))
    const alimSatimTarih = parseTarih(h(r, 50)), alimSatimTL = sayi(h(r, 51)), alimSatimAciklama = h(r, 52)
    if (alimSatimTarih && alimSatimTarih.getFullYear() < 2100 && alimSatimTL !== 0) kayitlar.push({ tarih: alimSatimTarih.toISOString(), tur: 'Alım Satım', miktar: alimSatimTL, islem_tl: alimSatimTL, aciklama: alimSatimAciklama ? String(alimSatimAciklama) : null })
  }

  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('birikim_hareketler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

async function importBorcAlacak(ws) {
  const kayitlar = []
  const sonSatir = ws['!ref'] ? parseInt(ws['!ref'].split(':')[1].replace(/[A-Z]/g, '')) : 231
  const h = (r, c) => hucreOku(ws, r, c)
  let sonKisi = null

  for (let r = 21; r <= sonSatir; r++) {
    const tarihVal = h(r, 1), kisiVal = h(r, 2)
    const alinan = sayi(h(r, 3)), odenen = sayi(h(r, 4))
    const dovizMiktar = sayi(h(r, 7)), dovizBirim = h(r, 8), aciklama = h(r, 9)
    if (kisiVal && String(kisiVal).trim()) sonKisi = String(kisiVal).trim()
    if (!sonKisi) continue
    if (alinan === 0 && odenen === 0) continue
    const tarih = parseTarih(tarihVal)
    if (tarih && tarih.getFullYear() > 2030) continue
    const base = { kisi: sonKisi, tarih: tarih ? tarih.toISOString() : null, doviz_miktar: dovizMiktar !== 0 ? dovizMiktar : null, doviz_birim: dovizBirim ? String(dovizBirim).trim() : null, aciklama: aciklama ? String(aciklama).trim() : null }
    if (alinan !== 0) kayitlar.push({ ...base, hareket_tipi: 'alindi', tutar: Math.abs(alinan) })
    if (odenen !== 0) kayitlar.push({ ...base, hareket_tipi: 'odendi', tutar: Math.abs(odenen) })
  }

  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('borc_hareketler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

// --- Import kalemleri tanımı ---
const IMPORTLAR = [
  {
    key: 'gider', label: 'Gider Detay', emoji: '➖',
    aciklama: 'Tüm gider işlemleri (K/N ayrımıyla)',
    sheetFn: (wb) => wb.SheetNames.find(n => n === 'Gider Detay'),
    importFn: importGiderDetay,
    silFn: () => supabase.from('giderler').delete().neq('id', 0),
  },
  {
    key: 'gelir', label: 'Gelir Detay', emoji: '➕',
    aciklama: 'Maaş, prim, alacak ve diğer gelirler',
    sheetFn: (wb) => wb.SheetNames.find(n => n === 'Gelir Detay'),
    importFn: importGelirDetay,
    silFn: () => supabase.from('gelirler').delete().neq('id', 0),
  },
  {
    key: 'nk', label: 'NK Transferler', emoji: '🔄',
    aciklama: 'Banka ↔ Nakit transferleri',
    sheetFn: (wb) => wb.SheetNames.find(n => n === 'NK'),
    importFn: importNK,
    silFn: () => supabase.from('nk_transferler').delete().neq('id', 0),
  },
  {
    key: 'birikim', label: 'Birikim', emoji: '💰',
    aciklama: 'TL, Altın, GMS, USD, EUR, GBP, İnşaat, Şirketi Hayriyye, Palandora, Alım Satım, Büyükbaş',
    sheetFn: (wb) => wb.SheetNames.find(n => n === 'Birikim'),
    importFn: importBirikim,
    silFn: () => supabase.from('birikim_hareketler').delete().neq('id', 0),
  },
  {
    key: 'borc', label: 'Borç-Alacak', emoji: '📋',
    aciklama: 'Kişi bazlı borç ve alacak hareketleri',
    sheetFn: (wb) => wb.SheetNames.find(n => n.toLowerCase().includes('bor') && n.includes('lacak')),
    importFn: importBorcAlacak,
    silFn: () => supabase.from('borc_hareketler').delete().neq('id', 0),
  },
]

function ImportKalemi({ kalem }) {
  const [durum, setDurum] = useState(null) // null | 'yukleniyor' | 'ok' | 'hata'
  const [sayi_, setSayi] = useState(null)

  const isle = async (e) => {
    const dosya = e.target.files[0]
    if (!dosya) return
    setDurum('yukleniyor')
    setSayi(null)
    try {
      const buffer = await dosya.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
      const sheetName = kalem.sheetFn(wb)
      if (!sheetName) { setDurum('hata'); return }
      const adet = await kalem.importFn(wb.Sheets[sheetName])
      setSayi(adet)
      setDurum('ok')
    } catch (err) {
      console.error(err)
      setDurum('hata')
    } finally {
      e.target.value = ''
    }
  }

  const sil = async () => {
    if (!confirm(`${kalem.label} verileri silinsin mi?`)) return
    await kalem.silFn()
    setDurum(null)
    setSayi(null)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">{kalem.emoji}</span>
            <h3 className="text-sm font-semibold text-slate-700">{kalem.label}</h3>
          </div>
          <p className="text-xs text-slate-400">{kalem.aciklama}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sil butonu */}
          <button onClick={sil} title="Verileri Sil"
            className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>

          {/* Import butonu */}
          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
            durum === 'yukleniyor'
              ? 'bg-blue-50 text-blue-500'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            {durum === 'yukleniyor' ? (
              <><div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Yükleniyor</>
            ) : (
              <><Upload size={13} /> Import</>
            )}
            <input type="file" accept=".xlsx,.xls" onChange={isle} className="hidden" disabled={durum === 'yukleniyor'} />
          </label>
        </div>
      </div>

      {/* Durum */}
      {durum === 'ok' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
          <CheckCircle size={13} />
          {sayi_} kayıt aktarıldı.
        </div>
      )}
      {durum === 'hata' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
          <AlertCircle size={13} />
          Hata oluştu — sheet bulunamadı veya veri bozuk.
        </div>
      )}
    </div>
  )
}

export default function Import() {
  const [tumDurum, setTumDurum] = useState(null)
  const [tumSonuc, setTumSonuc] = useState(null)

  const tumunuSil = async () => {
    if (!confirm('Tüm veriler silinecek. Emin misiniz?')) return
    await Promise.all([
      supabase.from('giderler').delete().neq('id', 0),
      supabase.from('gelirler').delete().neq('id', 0),
      supabase.from('nk_transferler').delete().neq('id', 0),
      supabase.from('birikim_hareketler').delete().neq('id', 0),
      supabase.from('borc_hareketler').delete().neq('id', 0),
      supabase.from('borc_alacak').delete().neq('id', 0),
    ])
    setTumDurum(null)
    setTumSonuc(null)
    alert('Tüm veriler silindi.')
  }

  const tumunuImport = async (e) => {
    const dosya = e.target.files[0]
    if (!dosya) return
    setTumDurum('yukleniyor')
    setTumSonuc(null)
    try {
      const buffer = await dosya.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
      const sonuc = {}
      for (const kalem of IMPORTLAR) {
        const sheetName = kalem.sheetFn(wb)
        if (sheetName) {
          sonuc[kalem.label] = await kalem.importFn(wb.Sheets[sheetName])
        }
      }
      setTumSonuc(sonuc)
      setTumDurum('ok')
    } catch (err) {
      console.error(err)
      setTumDurum('hata')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-3">
      <h2 className="text-lg font-semibold text-slate-700 mb-1">Veri İmport</h2>

      {/* Tek seferde tümünü import */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-blue-700 mb-1">📂 Tüm Sayfaları İmport Et</h3>
        <p className="text-xs text-blue-500 mb-3">Muhasebe.xlsx seçin — tüm sayfalar tek seferde aktarılır.</p>
        <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
          tumDurum === 'yukleniyor' ? 'bg-blue-200 text-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
          {tumDurum === 'yukleniyor' ? (
            <><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Yükleniyor...</>
          ) : (
            <><Upload size={15} /> Muhasebe.xlsx Seç</>
          )}
          <input type="file" accept=".xlsx,.xls" onChange={tumunuImport} className="hidden" disabled={tumDurum === 'yukleniyor'} />
        </label>

        {tumDurum === 'ok' && tumSonuc && (
          <div className="mt-3 bg-white rounded-xl p-3 space-y-1">
            <p className="text-xs font-medium text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Import tamamlandı!</p>
            {Object.entries(tumSonuc).map(([label, adet]) => (
              <p key={label} className="text-xs text-slate-500">• {label}: {adet} kayıt</p>
            ))}
          </div>
        )}
        {tumDurum === 'hata' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-white rounded-xl px-3 py-2">
            <AlertCircle size={13} /> Hata oluştu.
          </div>
        )}
      </div>

      {/* Ayrı ayrı import */}
      <div>
        <p className="text-xs text-slate-400 mb-2 px-1">veya kalem kalem import edin:</p>
        <div className="space-y-2">
          {IMPORTLAR.map(kalem => (
            <ImportKalemi key={kalem.key} kalem={kalem} />
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button onClick={tumunuSil}
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors">
          Tüm Verileri Sil
        </button>
      </div>
    </div>
  )
}
