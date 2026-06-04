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

  // TL Birleşik'e otomatik karşı giriş
  const tlKarsi = (tarih, islemTl, aciklama) => {
    if (!tarih || !islemTl) return
    kayitlar.push({ tarih, tur: 'TL Birleşik', doviz_cinsi: 'TL', miktar: islemTl, islem_tl: islemTl, aciklama })
  }

  for (let r = 18; r <= sonSatir; r++) {
    // --- TL Birleşik: A(1)=tarih, B(2)+C(3)+D(4) toplam ---
    const tlTarih = parseTarih(h(r, 1))
    const tlToplam = sayi(h(r, 2)) + sayi(h(r, 3)) + sayi(h(r, 4))
    if (tlTarih && tlToplam !== 0)
      kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL Birleşik', doviz_cinsi: 'TL', alt_tip: 'Birikim', miktar: tlToplam, islem_tl: tlToplam })

    // --- Borç Alacak: K(11)=tarih, L(12)=miktar, M(13)=açıklama → TL Birleşik ---
    const baTarih = parseTarih(h(r, 11))
    const baMiktar = sayi(h(r, 12)), baAciklama = h(r, 13)
    if (baTarih && baTarih.getFullYear() > 2000 && baTarih.getFullYear() < 2100 && baMiktar !== 0)
      kayitlar.push({ tarih: baTarih.toISOString(), tur: 'TL Birleşik', doviz_cinsi: 'TL', alt_tip: 'Borç Alacak', miktar: baMiktar, islem_tl: baMiktar, aciklama: baAciklama ? String(baAciklama) : null })

    // --- ALT(F) / ALT(H): E(5)=tarih, F(6)=gram, G(7)=TL, H(8)=kur, I(9)=tip ---
    const altTarih = parseTarih(h(r, 5))
    const altGram = sayi(h(r, 6)), altTL = sayi(h(r, 7)), altKur = sayi(h(r, 8))
    const altTip = h(r, 9)
    if (altTarih && altGram !== 0) {
      const hesap = (altTip && String(altTip).trim() === 'Fiziki') ? 'ALT(F)' : 'ALT(H)'
      const islemTip = altGram > 0 ? 'alımı' : 'satışı'
      kayitlar.push({ tarih: altTarih.toISOString(), tur: hesap, doviz_cinsi: 'ALT', alt_tip: altGram > 0 ? 'Alış' : 'Satış', miktar: altGram, islem_tl: altTL, kur: altKur || null })
      tlKarsi(altTarih.toISOString(), altTL, `${Math.abs(altGram)} gr ${hesap} ${islemTip}`)
    }

    // --- GMS(H): N(14)=tarih, O(15)=gram, P(16)=TL, Q(17)=kur ---
    const gmsTarih = parseTarih(h(r, 14))
    const gmsGram = sayi(h(r, 15)), gmsTL = sayi(h(r, 16)), gmsKur = sayi(h(r, 17))
    if (gmsTarih && gmsGram !== 0) {
      const islemTip = gmsGram > 0 ? 'alımı' : 'satışı'
      kayitlar.push({ tarih: gmsTarih.toISOString(), tur: 'GMS(H)', doviz_cinsi: 'GMS', alt_tip: gmsGram > 0 ? 'Alış' : 'Satış', miktar: gmsGram, islem_tl: gmsTL, kur: gmsKur || null })
      tlKarsi(gmsTarih.toISOString(), gmsTL, `${Math.abs(gmsGram)} gr GMS(H) ${islemTip}`)
    }

    // --- Yatırım (İnşaat): S(19)=tarih, T(20)=tip, U(21)=TL ---
    const insaatTarih = parseTarih(h(r, 19))
    const insaatTip = h(r, 20), insaatTL = sayi(h(r, 21))
    if (insaatTarih && insaatTarih.getFullYear() < 2100 && insaatTL !== 0) {
      kayitlar.push({ tarih: insaatTarih.toISOString(), tur: 'Yatırım (İnşaat)', doviz_cinsi: 'TL', alt_tip: insaatTip ? String(insaatTip) : null, miktar: insaatTL, islem_tl: insaatTL })
      tlKarsi(insaatTarih.toISOString(), insaatTL, `Yatırım (İnşaat)${insaatTip ? ' - ' + String(insaatTip) : ''}`)
    }

    // --- Yatırım (Şirketi Hayriyye): V(22)=tarih, W(23)=TL ---
    const sirketTarih = parseTarih(h(r, 22))
    const sirketTL = sayi(h(r, 23))
    if (sirketTarih && sirketTarih.getFullYear() > 2000 && sirketTarih.getFullYear() < 2100 && sirketTL !== 0) {
      kayitlar.push({ tarih: sirketTarih.toISOString(), tur: 'Yatırım (Şirketi Hayriyye)', doviz_cinsi: 'TL', miktar: sirketTL, islem_tl: sirketTL })
      tlKarsi(sirketTarih.toISOString(), sirketTL, 'Yatırım (Şirketi Hayriyye)')
    }

    // --- Yatırım (Palandora): Y(25)=tarih, Z(26)=TL, AA(27)=açıklama ---
    const palandoraTarih = parseTarih(h(r, 25))
    const palandoraTL = sayi(h(r, 26)), palandoraAciklama = h(r, 27)
    if (palandoraTarih && palandoraTarih.getFullYear() < 2100 && palandoraTL !== 0) {
      kayitlar.push({ tarih: palandoraTarih.toISOString(), tur: 'Yatırım (Palandora)', doviz_cinsi: 'TL', miktar: palandoraTL, islem_tl: palandoraTL, aciklama: palandoraAciklama ? String(palandoraAciklama) : null })
      tlKarsi(palandoraTarih.toISOString(), palandoraTL, `Yatırım (Palandora)${palandoraAciklama ? ' - ' + String(palandoraAciklama) : ''}`)
    }

    // --- USD: AC(29)=tarih, AD(30)=miktar, AE(31)=TL, AF(32)=kur ---
    const usdTarih = parseTarih(h(r, 29))
    const usdMiktar = sayi(h(r, 30)), usdTL = sayi(h(r, 31)), usdKur = sayi(h(r, 32))
    if (usdTarih && usdMiktar !== 0) {
      const islemTip = usdMiktar > 0 ? 'alımı' : 'satışı'
      kayitlar.push({ tarih: usdTarih.toISOString(), tur: 'USD', doviz_cinsi: 'USD', alt_tip: usdMiktar > 0 ? 'Alış' : 'Satış', miktar: usdMiktar, islem_tl: usdTL, kur: usdKur || null })
      tlKarsi(usdTarih.toISOString(), usdTL, `${Math.abs(usdMiktar)} USD ${islemTip}`)
    }

    // --- EUR: AN(40)=tarih, AO(41)=miktar, AP(42)=TL, AQ(43)=kur ---
    const eurTarih = parseTarih(h(r, 40))
    const eurMiktar = sayi(h(r, 41)), eurTL = sayi(h(r, 42)), eurKur = sayi(h(r, 43))
    if (eurTarih && eurMiktar !== 0) {
      const islemTip = eurMiktar > 0 ? 'alımı' : 'satışı'
      kayitlar.push({ tarih: eurTarih.toISOString(), tur: 'EUR', doviz_cinsi: 'EUR', alt_tip: eurMiktar > 0 ? 'Alış' : 'Satış', miktar: eurMiktar, islem_tl: eurTL, kur: eurKur || null })
      tlKarsi(eurTarih.toISOString(), eurTL, `${Math.abs(eurMiktar)} EUR ${islemTip}`)
    }

    // --- GBP: AS(45)=tarih, AT(46)=miktar, AU(47)=TL, AV(48)=kur ---
    const gbpTarih = parseTarih(h(r, 45))
    const gbpMiktar = sayi(h(r, 46)), gbpTL = sayi(h(r, 47)), gbpKur = sayi(h(r, 48))
    if (gbpTarih && gbpMiktar !== 0) {
      const islemTip = gbpMiktar > 0 ? 'alımı' : 'satışı'
      kayitlar.push({ tarih: gbpTarih.toISOString(), tur: 'GBP', doviz_cinsi: 'GBP', alt_tip: gbpMiktar > 0 ? 'Alış' : 'Satış', miktar: gbpMiktar, islem_tl: gbpTL, kur: gbpKur || null })
      tlKarsi(gbpTarih.toISOString(), gbpTL, `${Math.abs(gbpMiktar)} GBP ${islemTip}`)
    }

    // --- Yatırım (Al-Sat): AX(50)=tarih, AY(51)=TL, AZ(52)=açıklama ---
    const alSatTarih = parseTarih(h(r, 50))
    const alSatTL = sayi(h(r, 51)), alSatAciklama = h(r, 52)
    if (alSatTarih && alSatTarih.getFullYear() < 2100 && alSatTL !== 0) {
      kayitlar.push({ tarih: alSatTarih.toISOString(), tur: 'Yatırım (Al-Sat)', doviz_cinsi: 'TL', miktar: alSatTL, islem_tl: alSatTL, aciklama: alSatAciklama ? String(alSatAciklama) : null })
      tlKarsi(alSatTarih.toISOString(), alSatTL, `Yatırım (Al-Sat)${alSatAciklama ? ' - ' + String(alSatAciklama) : ''}`)
    }

    // --- Yatırım (Hayvancılık): BB(54)=tarih, BC(55)=TL, BD(56)=açıklama ---
    const hayvanTarih = parseTarih(h(r, 54))
    const hayvanTL = sayi(h(r, 55)), hayvanAciklama = h(r, 56)
    if (hayvanTarih && hayvanTarih.getFullYear() > 2000 && hayvanTL !== 0) {
      kayitlar.push({ tarih: hayvanTarih.toISOString(), tur: 'Yatırım (Hayvancılık)', doviz_cinsi: 'TL', miktar: hayvanTL, islem_tl: hayvanTL, aciklama: hayvanAciklama ? String(hayvanAciklama) : null })
      tlKarsi(hayvanTarih.toISOString(), hayvanTL, `Yatırım (Hayvancılık)${hayvanAciklama ? ' - ' + String(hayvanAciklama) : ''}`)
    }
  }

  // --- Kripto: AK(37) satır 12 × (-1) → TL Birleşik ---
  const kriptoVal = hucreOku(ws, 12, 37)
  if (kriptoVal !== null && sayi(kriptoVal) !== 0) {
    const kriptoTL = sayi(kriptoVal) * -1
    kayitlar.push({ tarih: new Date('2023-03-17').toISOString(), tur: 'TL Birleşik', doviz_cinsi: 'TL', alt_tip: 'Kripto', miktar: kriptoTL, islem_tl: kriptoTL, aciklama: 'kripto alımsatım' })
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
