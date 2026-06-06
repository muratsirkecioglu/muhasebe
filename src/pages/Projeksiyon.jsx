import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

const SEMBOL = { TL: '₺', USD: '$', EUR: '€', GBP: '£' }
const PERIYOT_LABEL = { aylik: '/ay', yillik: '/yıl', uc_aylik: '/3ay', haftalik: '/hf' }

function aylikEsde(k) {
  if (!k.aktif) return 0
  const t = k.tutar || 0
  switch (k.periyot) {
    case 'yillik':   return t / 12
    case 'uc_aylik': return t / 3
    case 'haftalik': return t * 4.33
    default:         return t
  }
}

// ─── Form Modalı ─────────────────────────────────────────────────────────────
function KalemFormu({ kalem, onKapat, onKayit }) {
  const [form, setForm] = useState({
    ad:          kalem?.ad          ?? '',
    tutar:       kalem?.tutar       !== undefined ? String(kalem.tutar) : '',
    tip:         kalem?.tip         ?? 'gider',
    doviz_cinsi: kalem?.doviz_cinsi ?? 'TL',
    periyot:     kalem?.periyot     ?? 'aylik',
    kategori:    kalem?.kategori    ?? '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const payload = {
      ad:          form.ad,
      tutar:       parseFloat(form.tutar) || 0,
      tip:         form.tip,
      doviz_cinsi: form.doviz_cinsi,
      periyot:     form.periyot,
      kategori:    form.kategori || null,
    }
    if (kalem?.id) {
      await supabase.from('sabit_kalemler').update(payload).eq('id', kalem.id)
    } else {
      await supabase.from('sabit_kalemler').insert(payload)
    }
    onKayit()
  }

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {kalem?.id ? '✏️ Kalem Düzenle' : '➕ Yeni Kalem'}
          </h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">

          {/* Gelir / Gider */}
          <div className="flex gap-2">
            {[['gelir', '📈 Gelir'], ['gider', '📉 Gider']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => set('tip', val)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  form.tip === val
                    ? val === 'gelir'
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'bg-red-50 border-red-400 text-red-700'
                    : 'border-slate-200 text-slate-400'
                }`}>{label}</button>
            ))}
          </div>

          {/* Ad */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Ad</label>
            <input value={form.ad} onChange={e => set('ad', e.target.value)} required
              placeholder="ör: Maaş, Kira, Market..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Tutar + Döviz */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tutar</label>
              <input type="number" step="0.01" value={form.tutar}
                onChange={e => set('tutar', e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Döviz</label>
              <select value={form.doviz_cinsi} onChange={e => set('doviz_cinsi', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['TL', 'USD', 'EUR', 'GBP'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Periyot */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Periyot</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[['aylik', 'Aylık'], ['yillik', 'Yıllık'], ['uc_aylik', '3 Aylık'], ['haftalik', 'Haftalık']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('periyot', val)}
                  className={`py-2 rounded-xl text-xs border transition-colors ${
                    form.periyot === val
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                      : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori (opsiyonel)</label>
            <input value={form.kategori} onChange={e => set('kategori', e.target.value)}
              placeholder="ör: Ulaşım, Fatura, Eğitim..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Kalem Tablosu ────────────────────────────────────────────────────────────
function KalemTablosu({ liste, tip, seciliId, setSeciliId, onDuzenle, onSil, onToggleAktif, onYukari, onAsagi }) {
  const isGelir = tip === 'gelir'
  const seciliIdx = liste.findIndex(k => k.id === seciliId)
  const secililideMi = liste.some(k => k.id === seciliId)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${isGelir ? 'text-green-600' : 'text-red-500'}`}>
          {isGelir ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isGelir ? 'Gelirler' : 'Giderler'}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <button onClick={onYukari}
              disabled={!secililideMi || seciliIdx <= 0}
              className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
              <ChevronUp size={13} />
            </button>
            <button onClick={onAsagi}
              disabled={!secililideMi || seciliIdx < 0 || seciliIdx >= liste.length - 1}
              className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
              <ChevronDown size={13} />
            </button>
          </div>
          <button onClick={() => onDuzenle({ tip })}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              isGelir ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'
            }`}>
            <Plus size={12} /> Ekle
          </button>
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">Henüz kayıt yok.</div>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {liste.map(k => {
              const sem = SEMBOL[k.doviz_cinsi] || k.doviz_cinsi
              const isSecili = k.id === seciliId
              const aylik = aylikEsde(k)
              return (
                <tr key={k.id}
                  onClick={() => setSeciliId(id => id === k.id ? null : k.id)}
                  className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                    isSecili ? 'bg-amber-50' : !k.aktif ? 'hover:bg-slate-50' : 'hover:bg-slate-50'
                  }`}>

                  {/* Ad */}
                  <td className={`pl-4 pr-3 py-2.5 border-l-2 ${
                    isSecili ? 'border-amber-400' : isGelir ? 'border-green-400' : 'border-red-400'
                  }`}>
                    <span className={`font-medium ${
                      isSecili ? 'text-amber-800' : !k.aktif ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}>
                      {k.ad}
                    </span>
                    {k.kategori && (
                      <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">{k.kategori}</span>
                    )}
                  </td>

                  {/* Tutar */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <span className={`font-bold ${isGelir ? 'text-green-600' : 'text-red-500'} ${!k.aktif ? 'opacity-40' : ''}`}>
                      {sem}{formatPara(k.tutar)}
                    </span>
                    <span className={`ml-0.5 ${!k.aktif ? 'text-slate-300' : 'text-slate-400'}`}>
                      {PERIYOT_LABEL[k.periyot] || ''}
                    </span>
                    {k.periyot !== 'aylik' && k.aktif && (
                      <div className="text-slate-400 text-[10px]">≈{sem}{formatPara(aylik)}/ay</div>
                    )}
                  </td>

                  {/* Aktif toggle */}
                  <td className="px-2 py-2.5 text-center w-8" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onToggleAktif(k.id, k.aktif)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                        k.aktif ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                      }`}>
                      {k.aktif && <span className="text-[10px] leading-none">✓</span>}
                    </button>
                  </td>

                  {/* Aksiyonlar */}
                  <td className="px-2 py-2 w-16" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-0.5 justify-end">
                      <button onClick={() => onDuzenle(k)}
                        className="p-1.5 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => onSil(k.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-100">
              <td className="px-4 py-2 text-slate-400">{liste.filter(k => k.aktif).length} aktif</td>
              <td className={`px-3 py-2 text-right font-bold ${isGelir ? 'text-green-600' : 'text-red-500'}`}>
                {/* Döviz başına toplam */}
                {(() => {
                  const map = {}
                  liste.filter(k => k.aktif).forEach(k => {
                    if (!map[k.doviz_cinsi]) map[k.doviz_cinsi] = 0
                    map[k.doviz_cinsi] += aylikEsde(k)
                  })
                  return Object.entries(map).map(([d, total]) => (
                    <div key={d}>{SEMBOL[d] || d}{formatPara(total)}/ay</div>
                  ))
                })()}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Projeksiyon() {
  const [kalemler, setKalemler] = useState([])
  const [formKalem, setFormKalem] = useState(null)   // null = kapalı
  const [seciliId, setSeciliId] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const { data } = await supabase
      .from('sabit_kalemler')
      .select('*')
      .order('sira', { nullsFirst: false })
      .order('created_at')
    setKalemler(data || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  // Sıralama — sadece aynı tip içinde
  const siraYenile = async (sirali) => {
    await Promise.all(sirali.map((k, i) =>
      supabase.from('sabit_kalemler').update({ sira: i }).eq('id', k.id)
    ))
    yukle()
  }

  const gelirler = kalemler.filter(k => k.tip === 'gelir').sort((a, b) => (a.sira ?? 9999) - (b.sira ?? 9999))
  const giderler = kalemler.filter(k => k.tip === 'gider').sort((a, b) => (a.sira ?? 9999) - (b.sira ?? 9999))

  const seciliKalem = kalemler.find(k => k.id === seciliId)
  const seciliTip   = seciliKalem?.tip
  const tipListesi  = seciliTip === 'gelir' ? gelirler : seciliTip === 'gider' ? giderler : []
  const seciliIdx   = tipListesi.findIndex(k => k.id === seciliId)

  const yukariTasi = async () => {
    if (seciliIdx <= 0) return
    const yeni = [...tipListesi]
    ;[yeni[seciliIdx - 1], yeni[seciliIdx]] = [yeni[seciliIdx], yeni[seciliIdx - 1]]
    await siraYenile(yeni)
  }

  const asagiTasi = async () => {
    if (seciliIdx < 0 || seciliIdx >= tipListesi.length - 1) return
    const yeni = [...tipListesi]
    ;[yeni[seciliIdx], yeni[seciliIdx + 1]] = [yeni[seciliIdx + 1], yeni[seciliIdx]]
    await siraYenile(yeni)
  }

  const toggleAktif = async (id, mevcutAktif) => {
    await supabase.from('sabit_kalemler').update({ aktif: !mevcutAktif }).eq('id', id)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu kalemi silmek istiyor musunuz?')) return
    await supabase.from('sabit_kalemler').delete().eq('id', id)
    if (seciliId === id) setSeciliId(null)
    yukle()
  }

  // ── Projeksiyon özeti (dövize göre) ──────────────────────────────────────
  const projeksiyonMap = {}
  for (const k of kalemler.filter(k => k.aktif)) {
    const d = k.doviz_cinsi || 'TL'
    if (!projeksiyonMap[d]) projeksiyonMap[d] = { gelir: 0, gider: 0 }
    const aylik = aylikEsde(k)
    if (k.tip === 'gelir') projeksiyonMap[d].gelir += aylik
    else                   projeksiyonMap[d].gider += aylik
  }

  if (yukleniyor) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-blue-600" />
        <h1 className="text-lg font-bold text-slate-800">Aylık Projeksiyon</h1>
      </div>

      {/* Projeksiyon Özet Kartları */}
      {Object.keys(projeksiyonMap).length > 0 && (
        <div className="space-y-3">
          {(['TL', 'USD', 'EUR', 'GBP']).filter(d => projeksiyonMap[d]).map(doviz => {
            const { gelir, gider } = projeksiyonMap[doviz]
            const net = gelir - gider
            const sem = SEMBOL[doviz] || doviz
            const pozitif = net >= 0
            return (
              <div key={doviz} className={`rounded-2xl border p-4 ${pozitif ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{doviz} — Aylık</p>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={11} className="text-green-500" />
                        <span className="text-slate-500">Gelir:</span>
                        <strong className="text-green-600">{sem}{formatPara(gelir)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingDown size={11} className="text-red-400" />
                        <span className="text-slate-500">Gider:</span>
                        <strong className="text-red-500">{sem}{formatPara(gider)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 mb-0.5">{pozitif ? 'Aylık Fazla' : 'Aylık Açık'}</p>
                    <p className={`text-2xl font-bold leading-tight ${pozitif ? 'text-green-600' : 'text-red-500'}`}>
                      {pozitif ? '+' : '-'}{sem}{formatPara(Math.abs(net))}
                    </p>
                  </div>
                </div>
                <div className={`mt-3 text-xs font-medium rounded-lg px-3 py-1.5 inline-block ${
                  pozitif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {pozitif
                    ? `✅ Gelecek ay ${sem}${formatPara(net)} fazlada olacaksınız`
                    : `⚠️ Gelecek ay ${sem}${formatPara(Math.abs(net))} açıkta olacaksınız`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tablolar */}
      <KalemTablosu
        liste={gelirler} tip="gelir"
        seciliId={seciliId} setSeciliId={setSeciliId}
        onDuzenle={setFormKalem} onSil={sil} onToggleAktif={toggleAktif}
        onYukari={yukariTasi} onAsagi={asagiTasi}
      />
      <KalemTablosu
        liste={giderler} tip="gider"
        seciliId={seciliId} setSeciliId={setSeciliId}
        onDuzenle={setFormKalem} onSil={sil} onToggleAktif={toggleAktif}
        onYukari={yukariTasi} onAsagi={asagiTasi}
      />

      {/* Form Modalı */}
      {formKalem !== null && (
        <KalemFormu
          kalem={formKalem?.id ? formKalem : formKalem}
          onKapat={() => setFormKalem(null)}
          onKayit={() => { setFormKalem(null); yukle() }}
        />
      )}
    </div>
  )
}
