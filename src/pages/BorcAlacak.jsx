import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih } from '../db'
import TarihInput from '../components/TarihInput'
import { Plus, Trash2, CreditCard, User, Scissors, Pencil } from 'lucide-react'

const DOVIZLER = ['TL', 'USD', 'EUR', 'GBP', 'ALT', 'GMS']
const SEMBOL = { TL: '₺', USD: '$', EUR: '€', GBP: '£', ALT: 'gr', GMS: 'gr' }

// --- Hesap Ekleme Formu ---
function HesapFormu({ onKapat, onKayit }) {
  const [form, setForm] = useState({ ad: '', tip: 'kisi', doviz_cinsi: 'TL', ekstre_gun: '', aciklama: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_hesaplar').insert({
      ad: form.ad.trim(),
      tip: form.tip,
      doviz_cinsi: form.doviz_cinsi,
      ekstre_gun: form.tip === 'kk' && form.ekstre_gun ? parseInt(form.ekstre_gun) : null,
      aciklama: form.aciklama || null,
    })
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">➕ Yeni Hesap</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Tipi</label>
            <div className="flex gap-2">
              {[['kisi', '👤 Kişi'], ['kk', '💳 Kredi Kartı']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tip: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tip === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              placeholder={form.tip === 'kk' ? 'ör: A-BANK(KK)' : 'ör: Ahmet Bey'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Döviz Cinsi</label>
            <select value={form.doviz_cinsi} onChange={e => setForm(f => ({ ...f, doviz_cinsi: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {DOVIZLER.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {form.tip === 'kk' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ekstre Günü (ayın kaçı)</label>
              <input type="number" min="1" max="31" value={form.ekstre_gun}
                onChange={e => setForm(f => ({ ...f, ekstre_gun: e.target.value }))}
                placeholder="ör: 15"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama (isteğe bağlı)</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Hesap Düzenleme Formu ---
function HesapDuzenleFormu({ hesap, onKapat, onKayit }) {
  const [form, setForm] = useState({
    ad: hesap.ad,
    tip: hesap.tip,
    doviz_cinsi: hesap.doviz_cinsi,
    ekstre_gun: hesap.ekstre_gun || '',
    aciklama: hesap.aciklama || '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_hesaplar').update({
      ad: form.ad.trim(),
      tip: form.tip,
      doviz_cinsi: form.doviz_cinsi,
      ekstre_gun: form.tip === 'kk' && form.ekstre_gun ? parseInt(form.ekstre_gun) : null,
      aciklama: form.aciklama || null,
    }).eq('id', hesap.id)
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Hesabı Düzenle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Tipi</label>
            <div className="flex gap-2">
              {[['kisi', '👤 Kişi'], ['kk', '💳 Kredi Kartı']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tip: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tip === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Döviz Cinsi</label>
            <select value={form.doviz_cinsi} onChange={e => setForm(f => ({ ...f, doviz_cinsi: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {DOVIZLER.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {form.tip === 'kk' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ekstre Günü (ayın kaçı)</label>
              <input type="number" min="1" max="31" value={form.ekstre_gun}
                onChange={e => setForm(f => ({ ...f, ekstre_gun: e.target.value }))}
                placeholder="ör: 15"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Kalem Düzenleme Formu ---
function KalemDuzenleFormu({ kalem, doviz_cinsi, onKapat, onKayit }) {
  const sembol = SEMBOL[doviz_cinsi] || doviz_cinsi
  const [form, setForm] = useState({
    tarih: kalem.tarih ? String(kalem.tarih).split('T')[0] : new Date().toISOString().split('T')[0],
    tutar: Math.abs(kalem.tutar),
    aciklama: kalem.aciklama || '',
  })
  const isPositive = kalem.tutar >= 0
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const yeniTutar = parseFloat(form.tutar) || 0
    await supabase.from('borc_kalemler').update({
      tarih: form.tarih,
      tutar: isPositive ? yeniTutar : -yeniTutar,
      aciklama: form.aciklama || null,
    }).eq('id', kalem.id)
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Kalemi Düzenle</h3>
          <p className="text-xs text-slate-400 mt-0.5">{isPositive ? '🔴 Borç' : '🟢 Ödeme'}</p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar ({sembol})</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Kişi: Al / Öde Formu ---
function AlOdeFormu({ hesap, onKapat, onKayit }) {
  const sembol = SEMBOL[hesap.doviz_cinsi] || hesap.doviz_cinsi
  const [form, setForm] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tur: 'al',
    tutar: '',
    aciklama: '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const tutar = parseFloat(form.tutar) || 0
    const d = new Date(form.tarih)
    const donem = d.getFullYear() * 100 + d.getMonth() + 1
    await supabase.from('borc_kalemler').insert({
      hesap_id: hesap.id,
      tarih: form.tarih,
      donem,
      tutar: form.tur === 'al' ? tutar : -tutar,
      aciklama: form.aciklama || null,
      tur: form.tur,
    })
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">👤 {hesap.ad}</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">İşlem</label>
            <div className="flex gap-2">
              {[['al', '↑ Al (Borç aldım)'], ['ode', '↓ Öde (Geri ödedim)']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tur: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tur === val
                      ? val === 'al' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-green-50 border-green-300 text-green-600'
                      : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar ({sembol})</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- KK: Harcama Ekleme Formu ---
function HarcamaFormu({ hesap, onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tutar: '',
    aciklama: '',
    harcama_tipi: 'pesin',
    taksit_sayisi: '2',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_harcamalar').insert({
      hesap_id: hesap.id,
      tarih: form.tarih,
      tutar: parseFloat(form.tutar) || 0,
      aciklama: form.aciklama || null,
      harcama_tipi: form.harcama_tipi,
      taksit_sayisi: form.harcama_tipi === 'taksitli' ? parseInt(form.taksit_sayisi) || 2 : 1,
      ekstre_kesildi: false,
    })
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">💳 Harcama Ekle — {hesap.ad}</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Tipi</label>
            <div className="flex gap-2">
              {[['pesin', '💵 Peşin / Tek Çekim'], ['taksitli', '📅 Taksitli']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, harcama_tipi: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.harcama_tipi === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Tarihi</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          {form.harcama_tipi === 'taksitli' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Taksit Sayısı</label>
              <input type="number" min="2" max="60" value={form.taksit_sayisi}
                onChange={e => setForm(f => ({ ...f, taksit_sayisi: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- KK: Ekstre Kes Modal ---
function EkstreFormu({ hesap, harcamalar, onKapat, onKayit }) {
  const bekleyenler = harcamalar.filter(h => !h.ekstre_kesildi)
  const [taksitler, setTaksitler] = useState({})
  const [ekstreTarih, setEkstreTarih] = useState(new Date().toISOString().split('T')[0])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Taksit miktarlarını başlat
  useEffect(() => {
    const init = {}
    bekleyenler.forEach(h => {
      if (h.harcama_tipi === 'taksitli') {
        const n = parseInt(h.taksit_sayisi) || 2
        const esit = Math.round(h.tutar / n * 100) / 100
        const son = Math.round((h.tutar - esit * (n - 1)) * 100) / 100
        init[h.id] = Array.from({ length: n }, (_, i) => i === n - 1 ? son : esit)
      }
    })
    setTaksitler(init)
  }, [])

  const taksitGuncelle = (hId, idx, deger) => {
    setTaksitler(t => {
      const yeni = [...t[hId]]
      yeni[idx] = deger
      return { ...t, [hId]: yeni }
    })
  }

  const kesEkstre = async () => {
    if (bekleyenler.length === 0) return
    setKaydediliyor(true)
    const baslangic = new Date(ekstreTarih)
    const grupId = crypto.randomUUID()
    const kalemler = []

    for (const h of bekleyenler) {
      if (h.harcama_tipi === 'pesin') {
        const donem = baslangic.getFullYear() * 100 + baslangic.getMonth() + 1
        kalemler.push({
          hesap_id: hesap.id,
          tarih: ekstreTarih,
          donem,
          tutar: h.tutar,
          aciklama: h.aciklama || 'Ekstre',
          tur: 'ekstre',
          grup_id: grupId,
        })
      } else {
        const miktarlar = taksitler[h.id] || []
        for (let i = 0; i < miktarlar.length; i++) {
          const t = new Date(baslangic)
          t.setMonth(t.getMonth() + i)
          const donem = t.getFullYear() * 100 + t.getMonth() + 1
          kalemler.push({
            hesap_id: hesap.id,
            tarih: t.toISOString().split('T')[0],
            donem,
            tutar: parseFloat(miktarlar[i]) || 0,
            aciklama: `${h.aciklama || 'Taksit'} (${i + 1}/${miktarlar.length})`,
            tur: 'taksit',
            taksit_no: i + 1,
            taksit_toplam: miktarlar.length,
            grup_id: grupId,
          })
        }
      }
    }

    if (kalemler.length > 0)
      await supabase.from('borc_kalemler').insert(kalemler)

    // Harcamaları kesildi olarak işaretle
    await supabase.from('borc_harcamalar')
      .update({ ekstre_kesildi: true })
      .in('id', bekleyenler.map(h => h.id))

    onKayit(); onKapat()
  }

  const toplamTutar = bekleyenler.reduce((s, h) => s + (h.tutar || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✂️ Ekstre Kes — {hesap.ad}</h3>
          <p className="text-xs text-slate-400 mt-1">{bekleyenler.length} bekleyen · ₺{formatPara(toplamTutar)} toplam</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Ekstre / Ödeme Başlangıç Tarihi</label>
            <TarihInput value={ekstreTarih} onChange={setEkstreTarih}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          {bekleyenler.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">Bekleyen harcama yok.</p>
          ) : bekleyenler.map(h => (
            <div key={h.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-slate-700">{h.aciklama || '—'}</p>
                  <p className="text-xs text-slate-400">
                    {formatTarih(h.tarih)} ·{' '}
                    {h.harcama_tipi === 'pesin' ? 'Tek Çekim' : `${h.taksit_sayisi} Taksit`}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-700">₺{formatPara(h.tutar)}</p>
              </div>

              {h.harcama_tipi === 'taksitli' && taksitler[h.id] && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">Taksit miktarları (düzenlenebilir):</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {taksitler[h.id].map((miktar, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-200">
                        <span className="text-xs text-slate-400 w-12 flex-shrink-0">{i + 1}. taksit</span>
                        <input type="number" step="0.01" value={miktar}
                          onChange={e => taksitGuncelle(h.id, i, e.target.value)}
                          className="flex-1 min-w-0 text-xs focus:outline-none text-right" />
                        <span className="text-xs text-slate-400">₺</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 px-1">
                    <span>Toplam:</span>
                    <span className={Math.abs((taksitler[h.id] || []).reduce((s, v) => s + (parseFloat(v) || 0), 0) - h.tutar) > 0.01 ? 'text-red-500 font-bold' : 'text-green-600'}>
                      ₺{formatPara((taksitler[h.id] || []).reduce((s, v) => s + (parseFloat(v) || 0), 0))}
                      {' / '}₺{formatPara(h.tutar)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
          <button onClick={kesEkstre} disabled={kaydediliyor || bekleyenler.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {kaydediliyor ? 'Kesiliyor...' : <><Scissors size={14} /> Ekstreyi Kes</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Ana Sayfa ---
export default function BorcAlacak() {
  const [sekme, setSekme] = useState('aktif') // 'aktif' | 'gecmis'
  const [hesaplar, setHesaplar] = useState([])
  const [gecmisHesaplar, setGecmisHesaplar] = useState([])
  const [gecmisBakiyeler, setGecmisBakiyeler] = useState({}) // hesap_id → bakiye
  const [secili, setSecili] = useState(null)
  const [hareketler, setHareketler] = useState([])
  const [harcamalar, setHarcamalar] = useState([])
  const [form, setForm] = useState(null) // null | 'hesap' | 'duzenle-hesap' | 'alode' | 'harcama' | 'ekstre'
  const [duzenleKalem, setDuzenleKalem] = useState(null) // kalem objesi
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukleHesaplar = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: aktif }, { data: gecmis }] = await Promise.all([
      supabase.from('borc_hesaplar').select('*').eq('aktif', true).order('created_at'),
      supabase.from('borc_hesaplar').select('*').eq('aktif', false).order('created_at'),
    ])
    setHesaplar(aktif || [])

    // Geçmiş hesapların bakiyelerini yükle
    const gHesaplar = gecmis || []
    setGecmisHesaplar(gHesaplar)
    if (gHesaplar.length > 0) {
      const bakiyeMap = {}
      await Promise.all(gHesaplar.map(async (h) => {
        const { data } = await supabase.from('borc_kalemler').select('tutar').eq('hesap_id', h.id)
        bakiyeMap[h.id] = (data || []).reduce((s, r) => s + (r.tutar || 0), 0)
      }))
      setGecmisBakiyeler(bakiyeMap)
    }
    setYukleniyor(false)
  }, [])

  const yukleDetay = useCallback(async (hesapId) => {
    if (!hesapId) return
    const [{ data: k }, { data: h }] = await Promise.all([
      supabase.from('borc_kalemler').select('*').eq('hesap_id', hesapId).order('tarih', { ascending: false }),
      supabase.from('borc_harcamalar').select('*').eq('hesap_id', hesapId).order('tarih', { ascending: false }),
    ])
    setHareketler(k || [])
    setHarcamalar(h || [])
  }, [])

  useEffect(() => { yukleHesaplar() }, [yukleHesaplar])
  useEffect(() => { if (secili) yukleDetay(secili.id) }, [secili, yukleDetay])

  const yenile = () => {
    yukleHesaplar()
    if (secili) yukleDetay(secili.id)
  }

  const silHareket = async (id) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('borc_kalemler').delete().eq('id', id)
    yukleDetay(secili.id)
  }

  const silHarcama = async (id) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('borc_harcamalar').delete().eq('id', id)
    yukleDetay(secili.id)
  }

  // Hesabı kapat → geçmişe taşır (aktif=false)
  const kapatHesap = async () => {
    if (!confirm(`"${secili.ad}" hesabı kapatılsın mı? Geçmiş sekmesinde görünmeye devam eder.`)) return
    await supabase.from('borc_hesaplar').update({ aktif: false }).eq('id', secili.id)
    setSecili(null)
    yukleHesaplar()
  }

  // Geçmişteki hesabı kalıcı sil
  const kaliciSil = async (id, ad) => {
    if (!confirm(`"${ad}" hesabı ve tüm hareketleri kalıcı olarak silinsin mi?`)) return
    await supabase.from('borc_hesaplar').delete().eq('id', id)
    yukleHesaplar()
  }

  // Geçmişteki hesabı yeniden aç
  const geriAc = async (id) => {
    await supabase.from('borc_hesaplar').update({ aktif: true }).eq('id', id)
    yukleHesaplar()
  }

  const seciliHesap = hesaplar.find(h => h.id === secili?.id) || null
  const bakiye = hareketler.reduce((s, r) => s + (r.tutar || 0), 0)
  const bekleyenSayisi = harcamalar.filter(h => !h.ekstre_kesildi).length
  const sembol = seciliHesap ? (SEMBOL[seciliHesap.doviz_cinsi] || seciliHesap.doviz_cinsi) : '₺'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Borç / Alacak</h2>
        {sekme === 'aktif' && (
          <button onClick={() => setForm('hesap')}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
            <Plus size={15} /> Hesap Ekle
          </button>
        )}
      </div>

      {/* Sekme Seçici */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => { setSekme('aktif'); setSecili(null) }}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            sekme === 'aktif' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
          }`}>
          Aktif
        </button>
        <button onClick={() => { setSekme('gecmis'); setSecili(null) }}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            sekme === 'gecmis' ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-200 text-slate-500'
          }`}>
          Geçmiş
          {gecmisHesaplar.length > 0 && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${sekme === 'gecmis' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {gecmisHesaplar.length}
            </span>
          )}
        </button>
      </div>

      {/* GEÇMİŞ SEKMESİ */}
      {sekme === 'gecmis' && (
        yukleniyor ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gecmisHesaplar.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm space-y-1">
            <p className="text-2xl">🗂️</p>
            <p>Geçmiş hesap yok.</p>
            <p>Kapatılan hesaplar burada görünür.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gecmisHesaplar.map(h => {
              const bak = gecmisBakiyeler[h.id] || 0
              const sem = SEMBOL[h.doviz_cinsi] || h.doviz_cinsi
              return (
                <div key={h.id} className="bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {h.tip === 'kk'
                        ? <CreditCard size={16} className="text-purple-400" />
                        : <User size={16} className="text-slate-400" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{h.ad}</p>
                        <p className="text-xs text-slate-400">{h.tip === 'kk' ? 'Kredi Kartı' : 'Kişi'} · {h.doviz_cinsi}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-bold ${bak > 0 ? 'text-red-500' : bak < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {sem}{formatPara(Math.abs(bak))}
                      </p>
                      <p className="text-xs text-slate-400">{bak > 0 ? 'Borç' : bak < 0 ? 'Alacak' : 'Sıfır'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => geriAc(h.id)}
                      className="flex-1 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                      Yeniden Aç
                    </button>
                    <button onClick={() => kaliciSil(h.id, h.ad)}
                      className="flex-1 py-1.5 rounded-xl border border-red-200 text-red-400 text-xs font-medium hover:bg-red-50 transition-colors">
                      Kalıcı Sil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* AKTİF SEKMESİ */}
      {sekme === 'aktif' && (
      <>
      {/* Hesap Kartları */}
      {yukleniyor ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hesaplar.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm space-y-1">
          <p className="text-2xl">📋</p>
          <p>Henüz hesap yok.</p>
          <p>Yukarıdan "Hesap Ekle" ile başlayın.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-5 -mx-4 px-4 md:mx-0 md:px-0">
          {hesaplar.map(h => {
            const isSecili = secili?.id === h.id
            const kkRenk = isSecili ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-700'
            const kisiRenk = isSecili ? 'bg-red-500 text-white border-red-500' : 'bg-white border-slate-200 text-slate-700'
            return (
              <button key={h.id} onClick={() => setSecili(h)}
                className={`flex-shrink-0 rounded-2xl p-4 text-left min-w-[150px] transition-all border-2 shadow-sm ${h.tip === 'kk' ? kkRenk : kisiRenk}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  {h.tip === 'kk'
                    ? <CreditCard size={14} className={isSecili ? 'opacity-80' : 'text-purple-500'} />
                    : <User size={14} className={isSecili ? 'opacity-80' : 'text-red-400'} />}
                  <span className="text-xs font-semibold truncate max-w-[110px]">{h.ad}</span>
                </div>
                <p className={`text-xs ${isSecili ? 'opacity-70' : 'text-slate-400'}`}>{h.doviz_cinsi}</p>
                {h.tip === 'kk' && h.ekstre_gun && (
                  <p className={`text-xs mt-0.5 ${isSecili ? 'opacity-70' : 'text-slate-400'}`}>Ekstre: {h.ekstre_gun}. gün</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Seçili Hesap Detayı */}
      {seciliHesap && (
        <>
          {/* Özet Kart */}
          <div className={`rounded-2xl p-4 mb-4 ${seciliHesap.tip === 'kk' ? 'bg-purple-50 border border-purple-100' : 'bg-red-50 border border-red-100'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  {seciliHesap.tip === 'kk' ? '💳 Kredi Kartı' : '👤 Kişi'} — {seciliHesap.ad}
                </p>
                <p className={`text-2xl font-bold ${bakiye > 0 ? 'text-red-600' : bakiye < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {sembol}{formatPara(Math.abs(bakiye))}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bakiye > 0 ? '🔴 Borç var' : bakiye < 0 ? '🟢 Alacak var' : 'Kapalı'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setForm('duzenle-hesap')}
                  title="Hesabı düzenle"
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={kapatHesap}
                  title="Hesabı kapat (geçmişe taşı)"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-400 hover:border-red-200 hover:text-red-400 transition-colors">
                  Kapat
                </button>
              </div>
            </div>

            {/* KK - Bekleyen harcama uyarısı */}
            {seciliHesap.tip === 'kk' && bekleyenSayisi > 0 && (
              <div className="mt-3 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-orange-700 font-medium">{bekleyenSayisi} bekleyen harcama (ekstre kesilmedi)</p>
                <button onClick={() => setForm('ekstre')}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                  <Scissors size={11} /> Kes
                </button>
              </div>
            )}
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex gap-2 mb-5">
            {seciliHesap.tip === 'kisi' ? (
              <button onClick={() => setForm('alode')}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">
                ↑↓ Al / Öde
              </button>
            ) : (
              <>
                <button onClick={() => setForm('harcama')}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-1.5">
                  <Plus size={14} /> Harcama Ekle
                </button>
                <button onClick={() => setForm('ekstre')}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium flex items-center justify-center gap-1.5">
                  <Scissors size={14} /> Ekstre Kes
                  {bekleyenSayisi > 0 && (
                    <span className="bg-white text-orange-500 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {bekleyenSayisi}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* KK - Bekleyen Harcamalar Listesi */}
          {seciliHesap.tip === 'kk' && harcamalar.filter(h => !h.ekstre_kesildi).length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-orange-600 mb-2 px-1">⏳ Ekstre Kesilmemiş Harcamalar</p>
              <div className="space-y-2">
                {harcamalar.filter(h => !h.ekstre_kesildi).map(h => (
                  <div key={h.id} className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{h.aciklama || '—'}</p>
                      <p className="text-xs text-slate-400">
                        {formatTarih(h.tarih)} ·{' '}
                        {h.harcama_tipi === 'pesin' ? 'Tek Çekim' : `${h.taksit_sayisi} Taksit`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-orange-600 flex-shrink-0">₺{formatPara(h.tutar)}</p>
                    <button onClick={() => silHarcama(h.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hareket Geçmişi */}
          <p className="text-xs font-semibold text-slate-500 mb-2 px-1">📝 Hareketler</p>
          {hareketler.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Hareket yok.</div>
          ) : (
            <div className="space-y-2">
              {hareketler.map(r => (
                <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.tutar > 0 ? 'bg-red-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {r.aciklama || (r.tur === 'ekstre' ? 'Ekstre' : r.tur === 'taksit' ? 'Taksit' : r.tur === 'al' ? 'Alındı' : 'Ödendi')}
                      </span>
                      {r.taksit_no && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {r.taksit_no}/{r.taksit_toplam}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{formatTarih(r.tarih)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${r.tutar > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {r.tutar > 0 ? '+' : ''}{sembol}{formatPara(Math.abs(r.tutar))}
                    </p>
                  </div>
                  <button onClick={() => setDuzenleKalem(r)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors flex-shrink-0">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => silHareket(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      </>
      )} {/* /aktif sekme */}

      {/* Formlar */}
      {form === 'hesap' && <HesapFormu onKapat={() => setForm(null)} onKayit={yenile} />}
      {form === 'duzenle-hesap' && seciliHesap && (
        <HesapDuzenleFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={() => { setForm(null); yukleHesaplar(); yukleDetay(seciliHesap.id) }} />
      )}
      {duzenleKalem && seciliHesap && (
        <KalemDuzenleFormu kalem={duzenleKalem} doviz_cinsi={seciliHesap.doviz_cinsi}
          onKapat={() => setDuzenleKalem(null)} onKayit={() => { setDuzenleKalem(null); yukleDetay(seciliHesap.id) }} />
      )}
      {form === 'alode' && seciliHesap?.tip === 'kisi' && (
        <AlOdeFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={yenile} />
      )}
      {form === 'harcama' && seciliHesap?.tip === 'kk' && (
        <HarcamaFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={yenile} />
      )}
      {form === 'ekstre' && seciliHesap?.tip === 'kk' && (
        <EkstreFormu hesap={seciliHesap} harcamalar={harcamalar} onKapat={() => setForm(null)} onKayit={yenile} />
      )}
    </div>
  )
}
