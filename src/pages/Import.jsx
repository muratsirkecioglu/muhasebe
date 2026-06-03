import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabase'
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'

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
    // DD.MM.YYYY formatı
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
  return parseFloat(String(val).replace(/,/g, '')) || 0
}

// --- Gider Detay import ---
async function importGiderDetay(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const kayitlar = []
  for (let i = 1; i < rows.length; i++) {
    const [tarihVal, kategori, k, , , aciklama, donemVal] = rows[i]
    if (!tarihVal || !kategori) continue
    const tarih = parseTarih(tarihVal)
    if (!tarih) continue
    const tutar = sayi(k)
    if (tutar <= 0) continue
    const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
    kayitlar.push({ tarih: tarih.toISOString(), donem, kategori: String(kategori), k: tutar, aciklama: aciklama ? String(aciklama) : '' })
  }
  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('giderler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

// --- Gelir Detay import ---
async function importGelirDetay(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const kayitlar = []
  for (let i = 1; i < rows.length; i++) {
    const [tarihVal, tur, k, , aciklama, donemVal] = rows[i]
    if (!tarihVal || !tur) continue
    const tarih = parseTarih(tarihVal)
    if (!tarih) continue
    const tutar = sayi(k)
    if (tutar <= 0) continue
    const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
    kayitlar.push({ tarih: tarih.toISOString(), donem, tur: String(tur), k: tutar, aciklama: aciklama ? String(aciklama) : '' })
  }
  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('gelirler').insert(kayitlar.slice(i, i + 500))
  return kayitlar.length
}

// --- Birikim import ---
async function importBirikim(ws) {
  const kayitlar = []
  const sonSatir = ws['!ref'] ? parseInt(ws['!ref'].split(':')[1].replace(/[A-Z]/g, '')) : 1011

  const hucre = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })
    const cell = ws[addr]
    return cell ? cell.v : null
  }

  for (let r = 18; r <= sonSatir; r++) {
    // --- TL Birikim (C1=tarih, C2=tutar, C3=kiraFark, C4=küsürat) ---
    const tlTarih = parseTarih(hucre(r, 1))
    const tlTutar = sayi(hucre(r, 2))
    if (tlTarih && tlTutar !== 0) {
      kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Birikim', miktar: tlTutar, islem_tl: tlTutar, kur: 1 })
    }
    const kiraFark = sayi(hucre(r, 3))
    if (tlTarih && kiraFark !== 0) {
      kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Kira Fark', miktar: kiraFark, islem_tl: kiraFark, kur: 1 })
    }
    const kusurat = sayi(hucre(r, 4))
    if (tlTarih && kusurat !== 0) {
      kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'TL', alt_tip: 'Küsürat', miktar: kusurat, islem_tl: kusurat, kur: 1 })
    }

    // --- Altın (C5=tarih, C6=gram, C7=TL, C8=kur) ---
    const altinTarih = parseTarih(hucre(r, 5)) || tlTarih
    const altinGram = sayi(hucre(r, 6))
    const altinTL = sayi(hucre(r, 7))
    const altinKur = sayi(hucre(r, 8))
    if (altinTarih && altinGram !== 0) {
      kayitlar.push({ tarih: altinTarih.toISOString(), tur: 'Altın', alt_tip: altinGram > 0 ? 'Alış' : 'Satış', miktar: altinGram, islem_tl: altinTL, kur: altinKur })
    }

    // --- GMS Altın (C15=gram, C16=TL) ---
    const gmsGram = sayi(hucre(r, 15))
    const gmsTL = sayi(hucre(r, 16))
    if (tlTarih && gmsGram !== 0) {
      kayitlar.push({ tarih: tlTarih.toISOString(), tur: 'GMS Altın', alt_tip: gmsGram > 0 ? 'Alış' : 'Satış', miktar: gmsGram, islem_tl: gmsTL })
    }

    // --- İnşaat (C19=tarih, C20=tip, C21=TL) ---
    const insaatTarih = parseTarih(hucre(r, 19))
    const insaatTip = hucre(r, 20)
    const insaatTL = sayi(hucre(r, 21))
    if (insaatTarih && insaatTL !== 0) {
      kayitlar.push({ tarih: insaatTarih.toISOString(), tur: 'İnşaat', alt_tip: insaatTip ? String(insaatTip) : null, miktar: insaatTL, islem_tl: insaatTL })
    }

    // --- USD (C29=tarih, C30=USD, C31=TL, C32=kur) ---
    const usdTarih = parseTarih(hucre(r, 29))
    const usdMiktar = sayi(hucre(r, 30))
    const usdTL = sayi(hucre(r, 31))
    const usdKur = sayi(hucre(r, 32))
    if (usdTarih && usdMiktar !== 0) {
      kayitlar.push({ tarih: usdTarih.toISOString(), tur: 'USD', alt_tip: usdMiktar > 0 ? 'Alış' : 'Satış', miktar: usdMiktar, islem_tl: usdTL, kur: usdKur })
    }

    // --- EUR (C40=tarih, C41=EUR, C42=TL, C43=kur) ---
    const eurTarih = parseTarih(hucre(r, 40))
    const eurMiktar = sayi(hucre(r, 41))
    const eurTL = sayi(hucre(r, 42))
    const eurKur = sayi(hucre(r, 43))
    if (eurTarih && eurMiktar !== 0) {
      kayitlar.push({ tarih: eurTarih.toISOString(), tur: 'EUR', alt_tip: eurMiktar > 0 ? 'Alış' : 'Satış', miktar: eurMiktar, islem_tl: eurTL, kur: eurKur })
    }

    // --- GBP (C45=tarih, C46=GBP, C47=TL, C48=kur) ---
    const gbpTarih = parseTarih(hucre(r, 45))
    const gbpMiktar = sayi(hucre(r, 46))
    const gbpTL = sayi(hucre(r, 47))
    const gbpKur = sayi(hucre(r, 48))
    if (gbpTarih && gbpMiktar !== 0) {
      kayitlar.push({ tarih: gbpTarih.toISOString(), tur: 'GBP', alt_tip: gbpMiktar > 0 ? 'Alış' : 'Satış', miktar: gbpMiktar, islem_tl: gbpTL, kur: gbpKur })
    }

    // --- Büyükbaş Hayvan (C54=tarih, C55=TL) ---
    const buyukbasTarih = parseTarih(hucre(r, 54))
    const buyukbasTL = sayi(hucre(r, 55))
    if (buyukbasTarih && buyukbasTL !== 0) {
      kayitlar.push({ tarih: buyukbasTarih.toISOString(), tur: 'Büyükbaş Hayvan', miktar: buyukbasTL, islem_tl: buyukbasTL })
    }
  }

  for (let i = 0; i < kayitlar.length; i += 500)
    await supabase.from('birikim_hareketler').insert(kayitlar.slice(i, i + 500))

  return kayitlar.length
}

// --- Ana bileşen ---
export default function Import() {
  const [durum, setDurum] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [detay, setDetay] = useState(null)

  const excelIsle = async (e) => {
    const dosya = e.target.files[0]
    if (!dosya) return
    setYukleniyor(true)
    setDurum(null)
    setDetay(null)
    try {
      const buffer = await dosya.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
      const sonuc = {}

      if (wb.SheetNames.includes('Gider Detay'))
        sonuc.gider = await importGiderDetay(wb.Sheets['Gider Detay'])

      if (wb.SheetNames.includes('Gelir Detay'))
        sonuc.gelir = await importGelirDetay(wb.Sheets['Gelir Detay'])

      if (wb.SheetNames.includes('Birikim'))
        sonuc.birikim = await importBirikim(wb.Sheets['Birikim'])

      setDetay(sonuc)
      setDurum('basarili')
    } catch (err) {
      console.error(err)
      setDurum('hata')
    } finally {
      setYukleniyor(false)
      e.target.value = ''
    }
  }

  const veritabaniniTemizle = async () => {
    if (!confirm('Tüm veriler sunucudan silinecek. Emin misiniz?')) return
    await Promise.all([
      supabase.from('giderler').delete().neq('id', 0),
      supabase.from('gelirler').delete().neq('id', 0),
      supabase.from('birikimler').delete().neq('id', 0),
      supabase.from('birikim_hareketler').delete().neq('id', 0),
      supabase.from('borc_alacak').delete().neq('id', 0),
    ])
    setDurum('temizlendi')
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Veri Yönetimi</h2>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">📊 Excel'den Import</h3>
        <p className="text-xs text-slate-400 mb-1">
          <strong>Muhasebe.xlsx</strong> dosyasını seçin. Şu sayfalar aktarılır:
        </p>
        <ul className="text-xs text-slate-400 mb-4 list-disc list-inside space-y-0.5">
          <li>Gider Detay → Giderler</li>
          <li>Gelir Detay → Gelirler</li>
          <li>Birikim → TL, Altın, GMS, İnşaat, USD, EUR, GBP, Büyükbaş</li>
        </ul>
        <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          yukleniyor ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}>
          {yukleniyor ? (
            <div className="flex flex-col items-center gap-2 text-blue-600 text-sm">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Yükleniyor... (1-2 dakika sürebilir)
            </div>
          ) : (
            <>
              <FileSpreadsheet size={32} className="text-slate-300" />
              <div className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Upload size={15} /> Muhasebe.xlsx Seç
              </div>
            </>
          )}
          <input type="file" accept=".xlsx,.xls" onChange={excelIsle} className="hidden" disabled={yukleniyor} />
        </label>
      </div>

      {durum === 'basarili' && detay && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-700">Import başarılı!</p>
            <div className="text-xs text-green-600 mt-1 space-y-0.5">
              {detay.gider != null && <p>✓ {detay.gider} gider kaydı</p>}
              {detay.gelir != null && <p>✓ {detay.gelir} gelir kaydı</p>}
              {detay.birikim != null && <p>✓ {detay.birikim} birikim hareketi (TL, Altın, Döviz, İnşaat...)</p>}
            </div>
          </div>
        </div>
      )}

      {durum === 'hata' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">Hata oluştu. Konsolu kontrol edin (F12).</p>
        </div>
      )}

      {durum === 'temizlendi' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-sm text-slate-600">Tüm veriler silindi.</p>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400 mb-3">Tehlikeli Alan</p>
        <button onClick={veritabaniniTemizle}
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors">
          Tüm Verileri Sil
        </button>
      </div>
    </div>
  )
}
