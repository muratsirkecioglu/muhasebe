import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabase'
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'

function parseTarih(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    return new Date(d.y, d.m - 1, d.d)
  }
  const d = new Date(val)
  return isNaN(d) ? null : d
}

function donemHesapla(tarih) {
  if (!tarih) return null
  return tarih.getFullYear() * 100 + tarih.getMonth() + 1
}

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
      let giderSayisi = 0, gelirSayisi = 0

      const giderSayfasi = wb.SheetNames.find(n => n === 'Gider Detay')
      if (giderSayfasi) {
        const ws = wb.Sheets[giderSayfasi]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
        const kayitlar = []
        for (let i = 1; i < rows.length; i++) {
          const [tarihVal, kategori, k, , , aciklama, donemVal] = rows[i]
          if (!tarihVal || !kategori) continue
          const tarih = parseTarih(tarihVal)
          if (!tarih) continue
          const tutar = parseFloat(k) || 0
          if (tutar <= 0) continue
          const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
          kayitlar.push({
            tarih: tarih.toISOString(), donem,
            kategori: String(kategori), k: tutar,
            aciklama: aciklama ? String(aciklama) : '',
          })
        }
        // 500'erli batch ile yükle
        for (let i = 0; i < kayitlar.length; i += 500) {
          await supabase.from('giderler').insert(kayitlar.slice(i, i + 500))
        }
        giderSayisi = kayitlar.length
      }

      const gelirSayfasi = wb.SheetNames.find(n => n === 'Gelir Detay')
      if (gelirSayfasi) {
        const ws = wb.Sheets[gelirSayfasi]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
        const kayitlar = []
        for (let i = 1; i < rows.length; i++) {
          const [tarihVal, tur, k, , aciklama, donemVal] = rows[i]
          if (!tarihVal || !tur) continue
          const tarih = parseTarih(tarihVal)
          if (!tarih) continue
          const tutar = parseFloat(k) || 0
          if (tutar <= 0) continue
          const donem = donemVal ? parseInt(String(donemVal)) : donemHesapla(tarih)
          kayitlar.push({
            tarih: tarih.toISOString(), donem,
            tur: String(tur), k: tutar,
            aciklama: aciklama ? String(aciklama) : '',
          })
        }
        for (let i = 0; i < kayitlar.length; i += 500) {
          await supabase.from('gelirler').insert(kayitlar.slice(i, i + 500))
        }
        gelirSayisi = kayitlar.length
      }

      setDetay({ giderSayisi, gelirSayisi })
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
      supabase.from('borc_alacak').delete().neq('id', 0),
    ])
    setDurum('temizlendi')
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Veri Yönetimi</h2>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">📊 Excel'den Import</h3>
        <p className="text-xs text-slate-400 mb-4">
          <strong>Muhasebe.xlsx</strong> dosyasını seçerek Gider Detay ve Gelir Detay sayfalarını aktarın.
          Veriler Supabase'e (bulut) kaydedilir.
        </p>
        <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          yukleniyor ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}>
          {yukleniyor ? (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Yükleniyor... (büyük dosya biraz sürebilir)
            </div>
          ) : (
            <>
              <FileSpreadsheet size={32} className="text-slate-300" />
              <div className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Upload size={15} /> Excel Seç (.xlsx)
              </div>
            </>
          )}
          <input type="file" accept=".xlsx,.xls" onChange={excelIsle} className="hidden" disabled={yukleniyor} />
        </label>
      </div>

      {durum === 'basarili' && detay && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">Import başarılı!</p>
            <p className="text-xs text-green-600 mt-0.5">{detay.giderSayisi} gider + {detay.gelirSayisi} gelir Supabase'e aktarıldı.</p>
          </div>
        </div>
      )}
      {durum === 'hata' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">Hata oluştu. Konsolu kontrol edin.</p>
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
          Tüm Verileri Sil (Supabase)
        </button>
      </div>
    </div>
  )
}
