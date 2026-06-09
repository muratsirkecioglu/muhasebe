import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { Download, Upload, CheckCircle, AlertCircle, Loader, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

// FK sırasına göre tablo listesi
const TABLOLAR = [
  { ad: 'kisiler',              conflict: 'id' },
  { ad: 'hesaplar',             conflict: 'id' },
  { ad: 'birikim_alt_hesaplar', conflict: 'id' },
  { ad: 'borc_hesaplar',        conflict: 'id' },
  { ad: 'borc_kalemler',        conflict: 'id' },
  { ad: 'borc_harcamalar',      conflict: 'id' },
  { ad: 'donem_kapanislari',    conflict: 'donem,hesap_id' },
  { ad: 'hesap_hareketler',     conflict: 'id' },
]

async function fetchAll(tablo) {
  const SAYFA = 1000
  let tumVeriler = []
  let sayfa = 0
  while (true) {
    const { data, error } = await supabase
      .from(tablo)
      .select('*')
      .range(sayfa * SAYFA, (sayfa + 1) * SAYFA - 1)
    if (error || !data || data.length === 0) break
    tumVeriler = [...tumVeriler, ...data]
    if (data.length < SAYFA) break
    sayfa++
  }
  return tumVeriler
}

export default function Yedek() {
  const [durum, setDurum] = useState(null)   // null | 'export' | 'import' | 'ok' | 'hata'
  const [mesaj, setMesaj] = useState('')
  const [ilerleme, setIlerleme] = useState('')
  const dosyaRef = useRef()

  const disaAktar = async () => {
    setDurum('export')
    setMesaj('')
    try {
      const tablolar = {}
      for (const t of TABLOLAR) {
        setIlerleme(`${t.ad} çekiliyor…`)
        tablolar[t.ad] = await fetchAll(t.ad)
      }

      const yedek = {
        version: 1,
        tarih: new Date().toISOString(),
        uygulama: 'muhasebe',
        tablolar,
      }

      const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `muhasebe-yedek-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const toplamKayit = Object.values(tablolar).reduce((s, rows) => s + rows.length, 0)
      setDurum('ok')
      setMesaj(`${toplamKayit.toLocaleString('tr')} kayıt dışa aktarıldı.`)
    } catch (e) {
      setDurum('hata')
      setMesaj(e.message || 'Bilinmeyen hata')
    }
    setIlerleme('')
  }

  const excelAktar = async () => {
    setDurum('export')
    setMesaj('')
    try {
      const wb = XLSX.utils.book_new()
      let toplamKayit = 0

      for (const t of TABLOLAR) {
        setIlerleme(`${t.ad} çekiliyor…`)
        const satirlar = await fetchAll(t.ad)
        if (satirlar.length === 0) continue
        const ws = XLSX.utils.json_to_sheet(satirlar)
        XLSX.utils.book_append_sheet(wb, ws, t.ad.slice(0, 31)) // Excel sheet adı max 31 karakter
        toplamKayit += satirlar.length
      }

      XLSX.writeFile(wb, `muhasebe-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setDurum('ok')
      setMesaj(`${toplamKayit.toLocaleString('tr')} kayıt Excel'e aktarıldı.`)
    } catch (e) {
      setDurum('hata')
      setMesaj(e.message || 'Bilinmeyen hata')
    }
    setIlerleme('')
  }

  const iceAktar = async (e) => {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    e.target.value = ''

    if (!confirm(`"${dosya.name}" dosyasındaki veriler mevcut kayıtların üzerine yazılacak. Devam edilsin mi?`)) return

    setDurum('import')
    setMesaj('')
    try {
      const metin = await dosya.text()
      const yedek = JSON.parse(metin)

      if (!yedek.tablolar || yedek.uygulama !== 'muhasebe') {
        throw new Error('Geçersiz yedek dosyası. Muhasebe uygulamasına ait bir JSON seçin.')
      }

      let toplamKayit = 0
      const CHUNK = 500

      for (const t of TABLOLAR) {
        const satirlar = yedek.tablolar[t.ad]
        if (!satirlar || satirlar.length === 0) continue
        setIlerleme(`${t.ad} yükleniyor… (${satirlar.length} kayıt)`)

        for (let i = 0; i < satirlar.length; i += CHUNK) {
          const { error } = await supabase
            .from(t.ad)
            .upsert(satirlar.slice(i, i + CHUNK), { onConflict: t.conflict })
          if (error) throw new Error(`${t.ad}: ${error.message}`)
        }
        toplamKayit += satirlar.length
      }

      setDurum('ok')
      setMesaj(`${toplamKayit.toLocaleString('tr')} kayıt içe aktarıldı.`)
    } catch (e) {
      setDurum('hata')
      setMesaj(e.message || 'Bilinmeyen hata')
    }
    setIlerleme('')
  }

  const yukleniyor = durum === 'export' || durum === 'import'

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Yedekleme</h1>

      <div className="space-y-4">
        {/* Dışa Aktar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Download size={20} className="text-blue-500" />
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">Dışa Aktar</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Tüm veriler indirilen dosyaya aktarılır.
          </p>
          <div className="flex gap-2">
            <button
              onClick={disaAktar}
              disabled={yukleniyor}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors">
              {durum === 'export' ? 'Çekiliyor…' : '📦 JSON'}
            </button>
            <button
              onClick={excelAktar}
              disabled={yukleniyor}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors">
              📊 Excel
            </button>
          </div>
        </div>

        {/* İçe Aktar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Upload size={20} className="text-emerald-500" />
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">İçe Aktar</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Daha önce alınan yedek dosyası geri yüklenir. Mevcut kayıtların üzerine yazılır.
          </p>
          <input ref={dosyaRef} type="file" accept=".json" className="hidden" onChange={iceAktar} />
          <button
            onClick={() => dosyaRef.current?.click()}
            disabled={yukleniyor}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors">
            {durum === 'import' ? 'Yükleniyor…' : 'Yedek Yükle'}
          </button>
        </div>

        {/* Durum */}
        {yukleniyor && ilerleme && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 px-1">
            <Loader size={14} className="animate-spin flex-shrink-0" />
            <span>{ilerleme}</span>
          </div>
        )}
        {durum === 'ok' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 px-1">
            <CheckCircle size={16} className="flex-shrink-0" />
            <span>{mesaj}</span>
          </div>
        )}
        {durum === 'hata' && (
          <div className="flex items-center gap-2 text-sm text-red-500 px-1">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{mesaj}</span>
          </div>
        )}
      </div>
    </div>
  )
}
