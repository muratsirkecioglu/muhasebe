import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { useMask } from '../MaskContext'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, TrendingUp, TrendingDown, BarChart2, CreditCard, CalendarDays } from 'lucide-react'

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

function sonrakiAy(donem) {
  const yil = Math.floor(donem / 100)
  const ay = donem % 100
  return ay === 12 ? (yil + 1) * 100 + 1 : yil * 100 + (ay + 1)
}

function donemLabel(donem) {
  const yil = Math.floor(donem / 100)
  const ay = donem % 100
  return new Date(yil, ay - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
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
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('sabit_kalemler').insert({ ...payload, user_id: user.id })
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
  const { maskeli } = useMask()
  const para = (v) => maskeli ? '••••' : formatPara(v)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
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
                      {sem}{para(k.tutar)}
                    </span>
                    <span className={`ml-0.5 ${!k.aktif ? 'text-slate-300' : 'text-slate-400'}`}>
                      {PERIYOT_LABEL[k.periyot] || ''}
                    </span>
                    {k.periyot !== 'aylik' && k.aktif && (
                      <div className="text-slate-400 text-[10px]">≈{sem}{para(aylik)}/ay</div>
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
                    <div key={d}>{SEMBOL[d] || d}{para(total)}/ay</div>
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
  const { maskeli } = useMask()
  const para = (v) => maskeli ? '••••' : formatPara(v)

  const [kalemler, setKalemler] = useState([])
  const [kkOzet, setKkOzet] = useState({ ekstre: {}, taksit: {} })
  const [gelecekTaksitler, setGelecekTaksitler] = useState({})
  const [formKalem, setFormKalem] = useState(null)   // null = kapalı
  const [seciliId, setSeciliId] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  const buAy = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
  const buAyLabel = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const buAyVal = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()

    const ay1 = sonrakiAy(buAyVal)
    const ay2 = sonrakiAy(ay1)

    const [sabitRes, hesaplarRes, harcamalarRes, kalemlerRes, gelecekRes] = await Promise.all([
      supabase.from('sabit_kalemler').select('*').order('sira', { nullsFirst: false }).order('created_at'),
      // Sadece KK hesapları — doviz_cinsi için
      supabase.from('borc_hesaplar').select('id, doviz_cinsi').eq('aktif', true).eq('tip', 'kk'),
      // Ekstre kesilmemiş tüm KK harcamaları
      supabase.from('borc_harcamalar').select('hesap_id, tutar').eq('ekstre_kesildi', false),
      // Bu ayın ödenmemiş taksit kalemleri
      supabase.from('borc_kalemler')
        .select('hesap_id, tutar')
        .eq('donem', buAyVal)
        .eq('odendi', false)
        .eq('tur', 'taksit'),
      // Gelecek 2 ayın taksit kalemleri
      supabase.from('borc_kalemler')
        .select('hesap_id, tutar, donem')
        .in('donem', [ay1, ay2])
        .eq('tur', 'taksit'),
    ])

    setKalemler(sabitRes.data || [])

    // KK hesap → doviz_cinsi map
    const hesapMap = {}
    for (const h of hesaplarRes.data || []) hesapMap[h.id] = h

    // Ekstre kesilmemiş harcamalar (borc_harcamalar)
    const ekstre = {}
    for (const r of harcamalarRes.data || []) {
      const doviz = hesapMap[r.hesap_id]?.doviz_cinsi || 'TL'
      ekstre[doviz] = (ekstre[doviz] || 0) + (r.tutar || 0)
    }

    // Bu ayın taksit ödemeleri (borc_kalemler)
    const taksit = {}
    for (const k of kalemlerRes.data || []) {
      const doviz = hesapMap[k.hesap_id]?.doviz_cinsi || 'TL'
      taksit[doviz] = (taksit[doviz] || 0) + (k.tutar || 0)
    }

    setKkOzet({ ekstre, taksit })

    // Gelecek 2 ay taksitleri → { donem: { doviz: tutar } }
    const gelecekMap = {}
    for (const k of gelecekRes.data || []) {
      if (!gelecekMap[k.donem]) gelecekMap[k.donem] = {}
      const doviz = hesapMap[k.hesap_id]?.doviz_cinsi || 'TL'
      gelecekMap[k.donem][doviz] = (gelecekMap[k.donem][doviz] || 0) + (k.tutar || 0)
    }
    setGelecekTaksitler(gelecekMap)

    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const gelirler = kalemler.filter(k => k.tip === 'gelir').sort((a, b) => (a.sira ?? 9999) - (b.sira ?? 9999))
  const giderler = kalemler.filter(k => k.tip === 'gider').sort((a, b) => (a.sira ?? 9999) - (b.sira ?? 9999))

  const seciliKalem = kalemler.find(k => k.id === seciliId)
  const seciliTip   = seciliKalem?.tip
  const tipListesi  = seciliTip === 'gelir' ? gelirler : seciliTip === 'gider' ? giderler : []
  const seciliIdx   = tipListesi.findIndex(k => k.id === seciliId)

  // İki kaydın yerini değiştirir.
  // - sira değerleri zaten atanmışsa: sadece bu iki satırın sira'sını takas eder (ucuz).
  // - sira hiç atanmamışsa (null): bu tip için ilk kullanımda, o anki görüntülenen sırayı
  //   esas alıp (takas uygulanmış haliyle) tüm listeyi 0,1,2,… diye normalize eder.
  const siraTakasEt = async (idxA, idxB) => {
    const liste = tipListesi
    const a = liste[idxA], b = liste[idxB]
    if (a.sira != null && b.sira != null) {
      await Promise.all([
        supabase.from('sabit_kalemler').update({ sira: b.sira }).eq('id', a.id),
        supabase.from('sabit_kalemler').update({ sira: a.sira }).eq('id', b.id),
      ])
    } else {
      const yeni = [...liste]
      ;[yeni[idxA], yeni[idxB]] = [yeni[idxB], yeni[idxA]]
      await Promise.all(
        yeni.map((k, i) => supabase.from('sabit_kalemler').update({ sira: i }).eq('id', k.id))
      )
    }
    yukle()
  }

  const yukariTasi = async () => {
    if (seciliIdx <= 0) return
    await siraTakasEt(seciliIdx, seciliIdx - 1)
  }

  const asagiTasi = async () => {
    if (seciliIdx < 0 || seciliIdx >= tipListesi.length - 1) return
    await siraTakasEt(seciliIdx, seciliIdx + 1)
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

  // ── Gelecek 2 ay projeksiyon ─────────────────────────────────────────────
  const gelecekAylar = useMemo(() => {
    const a1 = sonrakiAy(buAy)
    const a2 = sonrakiAy(a1)
    return [a1, a2].map(donem => {
      const dovizMap = {}
      for (const k of kalemler.filter(k => k.aktif)) {
        const d = k.doviz_cinsi || 'TL'
        if (!dovizMap[d]) dovizMap[d] = { gelir: 0, gider: 0, taksit: 0 }
        const aylik = aylikEsde(k)
        if (k.tip === 'gelir') dovizMap[d].gelir += aylik
        else dovizMap[d].gider += aylik
      }
      for (const [doviz, tutar] of Object.entries(gelecekTaksitler[donem] || {})) {
        if (!dovizMap[doviz]) dovizMap[doviz] = { gelir: 0, gider: 0, taksit: 0 }
        dovizMap[doviz].taksit += tutar
      }
      return { donem, dovizMap }
    })
  }, [buAy, kalemler, gelecekTaksitler])

  // ── Projeksiyon özeti (dövize göre) ──────────────────────────────────────
  const projeksiyonMap = useMemo(() => {
    const map = {}
    // Sabit kalemler
    for (const k of kalemler.filter(k => k.aktif)) {
      const d = k.doviz_cinsi || 'TL'
      if (!map[d]) map[d] = { gelir: 0, gider: 0 }
      const aylik = aylikEsde(k)
      if (k.tip === 'gelir') map[d].gelir += aylik
      else                   map[d].gider += aylik
    }
    // KK ekstre kesilmemiş harcamalar → gider
    for (const [d, tutar] of Object.entries(kkOzet.ekstre)) {
      if (!map[d]) map[d] = { gelir: 0, gider: 0 }
      map[d].gider += Number(tutar) || 0
    }
    // Bu ayın taksitleri → gider
    for (const [d, tutar] of Object.entries(kkOzet.taksit)) {
      if (!map[d]) map[d] = { gelir: 0, gider: 0 }
      map[d].gider += Number(tutar) || 0
    }
    return map
  }, [kalemler, kkOzet])

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
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{doviz} — Aylık</p>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <TrendingUp size={11} className="text-green-500" />
                      <span className="text-slate-500">Gelir:</span>
                      <strong className="text-green-600">{sem}{para(gelir)}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown size={11} className="text-red-400" />
                      <span className="text-slate-500">Gider:</span>
                      <strong className="text-red-500">{sem}{para(gider)}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-left mt-2">
                  <p className="text-[10px] text-slate-400 mb-0.5">{pozitif ? 'Aylık Fazla' : 'Aylık Açık'}</p>
                  <p className={`text-2xl font-bold leading-tight ${pozitif ? 'text-green-600' : 'text-red-500'}`}>
                    {pozitif ? '+' : '-'}{sem}{para(Math.abs(net))}
                  </p>
                </div>
                <div className={`mt-3 text-xs font-medium rounded-lg px-3 py-1.5 block ${
                  pozitif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {pozitif
                    ? `✅ Gelecek ay ${sem}${para(net)} fazlada olacaksınız`
                    : `⚠️ Gelecek ay ${sem}${para(Math.abs(net))} açıkta olacaksınız`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bu Ayın KK Yükümlülükleri */}
      {(Object.keys(kkOzet.ekstre).length > 0 || Object.keys(kkOzet.taksit).length > 0) && (() => {
        const dovizler = [...new Set([...Object.keys(kkOzet.ekstre), ...Object.keys(kkOzet.taksit)])]
        return (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-b border-purple-100">
              <CalendarDays size={13} className="text-purple-400" />
              <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                KK Yükümlülükleri
              </h3>
              <span className="ml-auto text-[10px] text-purple-400 font-medium capitalize">{buAyLabel} taksitleri</span>
            </div>

            {/* Ekstre satırları */}
            {Object.entries(kkOzet.ekstre).map(([doviz, tutar]) => (
              <div key={`e-${doviz}`} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard size={13} className="text-purple-400" />
                  Ekstre Kesilmemiş Harcamalar
                  {Object.keys(kkOzet.ekstre).length > 1 && <span className="text-xs text-slate-400">({doviz})</span>}
                </span>
                <span className="text-sm font-bold text-purple-600">
                  {SEMBOL[doviz] || doviz}{para(tutar)}
                </span>
              </div>
            ))}

            {/* Taksit satırları */}
            {Object.entries(kkOzet.taksit).map(([doviz, tutar]) => (
              <div key={`t-${doviz}`} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-base leading-none">📅</span>
                  Taksitler
                  {Object.keys(kkOzet.taksit).length > 1 && <span className="text-xs text-slate-400">({doviz})</span>}
                </span>
                <span className="text-sm font-bold text-orange-500">
                  {SEMBOL[doviz] || doviz}{para(tutar)}
                </span>
              </div>
            ))}

            {/* Toplam (döviz başına) */}
            {dovizler.map(doviz => {
              const total = (kkOzet.ekstre[doviz] || 0) + (kkOzet.taksit[doviz] || 0)
              const sem = SEMBOL[doviz] || doviz
              return (
                <div key={`tot-${doviz}`} className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-600">
                    Toplam{dovizler.length > 1 ? ` (${doviz})` : ''}
                  </span>
                  <span className="text-base font-bold text-slate-800">{sem}{para(total)}</span>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Gelecek 2 Ay Projeksiyonu */}
      {gelecekAylar.some(a => Object.keys(a.dovizMap).length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300">Gelecek 2 Ay Tahmini</h2>
          </div>
          {gelecekAylar.map(({ donem, dovizMap }) =>
            Object.keys(dovizMap).length === 0 ? null : (
              <div key={donem} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {donemLabel(donem)}
                  </span>
                </div>
                {(['TL', 'USD', 'EUR', 'GBP']).filter(d => dovizMap[d]).map(doviz => {
                  const { gelir, gider, taksit } = dovizMap[doviz]
                  const net = gelir - gider - taksit
                  const sem = SEMBOL[doviz] || doviz
                  const pozitif = net >= 0
                  return (
                    <div key={doviz} className="px-4 py-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <TrendingUp size={11} className="text-green-500" /> Sabit Gelirler
                        </span>
                        <span className="font-semibold text-green-600">+{sem}{para(gelir)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <TrendingDown size={11} className="text-red-400" /> Sabit Giderler
                        </span>
                        <span className="font-semibold text-red-500">-{sem}{para(gider)}</span>
                      </div>
                      {taksit > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <CreditCard size={11} className="text-purple-400" /> KK Taksitler
                          </span>
                          <span className="font-semibold text-purple-600">-{sem}{para(taksit)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between text-sm font-bold pt-1 border-t border-slate-100 dark:border-slate-700 ${pozitif ? 'text-green-600' : 'text-red-500'}`}>
                        <span>Tahmini Net</span>
                        <span>{pozitif ? '+' : '-'}{sem}{para(Math.abs(net))}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
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
