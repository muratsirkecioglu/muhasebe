import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, GIDER_KATEGORILER } from '../db'
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
// --- KK: Bekleyen Harcama Düzenleme ---
function HarcamaDuzenleFormu({ harcama, onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: harcama.tarih ? String(harcama.tarih).split('T')[0] : '',
    tutar: String(harcama.tutar || ''),
    kategori: harcama.kategori || GIDER_KATEGORILER[0],
    aciklama: harcama.aciklama || '',
    harcama_tipi: harcama.harcama_tipi || 'pesin',
    taksit_sayisi: String(harcama.taksit_sayisi || 2),
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_harcamalar').update({
      tarih: form.tarih,
      tutar: parseFloat(form.tutar) || 0,
      kategori: form.kategori || null,
      aciklama: form.aciklama || null,
      harcama_tipi: form.harcama_tipi,
      taksit_sayisi: form.harcama_tipi === 'taksitli' ? parseInt(form.taksit_sayisi) || 2 : 1,
    }).eq('id', harcama.id)
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Harcamayı Düzenle</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ekstre kesilmemiş harcama</p>
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
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {GIDER_KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
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

function taksitDagit(tutar, sayi) {
  const n = parseInt(sayi) || 2
  const t = parseFloat(tutar) || 0
  if (n <= 0 || t <= 0) return Array(n).fill('0.00')
  const esit = Math.round(t / n * 100) / 100
  const son = Math.round((t - esit * (n - 1)) * 100) / 100
  return Array.from({ length: n }, (_, i) => String(i === n - 1 ? son : esit))
}

function HarcamaFormu({ hesap, onKapat, onKayit }) {
  const bugun = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    tarih: bugun,
    tutar: '',
    kategori: GIDER_KATEGORILER[0],
    aciklama: '',
    harcama_tipi: 'pesin',
    taksit_sayisi: '2',
  })
  const [taksitler, setTaksitler] = useState(['', ''])
  const [odendi, setOdendi] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Tutar veya taksit sayısı değişince eşit dağıt
  useEffect(() => {
    if (form.harcama_tipi !== 'taksitli') return
    setTaksitler(taksitDagit(form.tutar, form.taksit_sayisi))
  }, [form.tutar, form.taksit_sayisi, form.harcama_tipi])

  // Taksit sayısı veya tarih değişince ödendi durumunu hesapla
  useEffect(() => {
    if (form.harcama_tipi !== 'taksitli') return
    const n = parseInt(form.taksit_sayisi) || 2
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const baslangic = new Date(form.tarih || bugun)
    const ekstreGun = hesap?.ekstre_gun

    setOdendi(Array.from({ length: n }, (_, i) => {
      const taksitAy = new Date(baslangic.getFullYear(), baslangic.getMonth() + i, 1)
      // Ekstre kesilme tarihi: o ayın ekstre_gun'u (yoksa ayın son günü)
      const ekstreTarihi = ekstreGun
        ? new Date(taksitAy.getFullYear(), taksitAy.getMonth(), ekstreGun)
        : new Date(taksitAy.getFullYear(), taksitAy.getMonth() + 1, 0)
      return ekstreTarihi < today
    }))
  }, [form.taksit_sayisi, form.tarih, form.harcama_tipi, hesap?.ekstre_gun])

  const taksitGuncelle = (idx, deger) => {
    setTaksitler(t => { const y = [...t]; y[idx] = deger; return y })
  }
  const odendiToggle = (idx) => {
    setOdendi(o => { const y = [...o]; y[idx] = !y[idx]; return y })
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)

    if (form.harcama_tipi === 'taksitli') {
      // Taksitli: doğrudan borc_kalemler'e aylık kayıt oluştur
      const grupId = crypto.randomUUID()
      const baslangic = new Date(form.tarih)
      const ekstreGun = hesap?.ekstre_gun
      const kalemler = taksitler.map((miktar, i) => {
        const taksitAy = new Date(baslangic.getFullYear(), baslangic.getMonth() + i, ekstreGun || 1)
        const donem = taksitAy.getFullYear() * 100 + taksitAy.getMonth() + 1
        return {
          hesap_id: hesap.id,
          tarih: taksitAy.toISOString().split('T')[0],
          donem,
          tutar: parseFloat(miktar) || 0,
          kategori: form.kategori || null,
          aciklama: `${form.aciklama || hesap.ad} (${i + 1}/${taksitler.length})`,
          tur: 'taksit',
          taksit_no: i + 1,
          taksit_toplam: taksitler.length,
          grup_id: grupId,
          odendi: odendi[i] || false,
        }
      })
      await supabase.from('borc_kalemler').insert(kalemler)
    } else {
      // Peşin: bekleyen listesine ekle, ekstre kesilince işlenir
      await supabase.from('borc_harcamalar').insert({
        hesap_id: hesap.id,
        tarih: form.tarih,
        tutar: parseFloat(form.tutar) || 0,
        kategori: form.kategori || null,
        aciklama: form.aciklama || null,
        harcama_tipi: 'pesin',
        taksit_sayisi: 1,
        ekstre_kesildi: false,
      })
    }

    onKayit(); onKapat()
  }

  const toplamTaksit = taksitler.reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const hedefTutar = parseFloat(form.tutar) || 0
  const fark = Math.abs(toplamTaksit - hedefTutar)
  const tutarEslesti = fark < 0.01

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">💳 Harcama Ekle — {hesap.ad}</h3>
        </div>
        <form onSubmit={kaydet} className="flex-1 overflow-y-auto p-5 space-y-4">
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
            <label className="text-xs font-medium text-slate-500 block mb-1">Toplam Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Kategorisi</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {GIDER_KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {form.harcama_tipi === 'taksitli' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Taksit Sayısı</label>
                <input type="number" min="2" max="60" value={form.taksit_sayisi}
                  onChange={e => setForm(f => ({ ...f, taksit_sayisi: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
              </div>

              {taksitler.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500">Taksit Miktarları (₺)</label>
                    <span className={`text-xs font-semibold ${tutarEslesti ? 'text-green-600' : 'text-red-500'}`}>
                      {formatPara(toplamTaksit)} / {formatPara(hedefTutar)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {taksitler.map((miktar, i) => {
                      const base = new Date(form.tarih || bugun)
                      const t = new Date(base.getFullYear(), base.getMonth() + i, 1)
                      const ay = t.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
                      const isOdendi = odendi[i] || false
                      return (
                        <div key={i} className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${isOdendi ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                          <button type="button" onClick={() => odendiToggle(i)}
                            className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isOdendi ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                            {isOdendi && <span className="text-xs leading-none">✓</span>}
                          </button>
                          <span className="text-xs text-slate-500 w-12 flex-shrink-0">{i + 1}. <span className="text-slate-400">{ay}</span></span>
                          <input
                            type="number" step="0.01" min="0" value={miktar}
                            onChange={e => taksitGuncelle(i, e.target.value)}
                            className={`flex-1 min-w-0 text-sm bg-transparent focus:outline-none text-right ${isOdendi ? 'text-green-700 line-through' : ''}`}
                          />
                          <span className="text-xs text-slate-400">₺</span>
                        </div>
                      )
                    })}
                  </div>
                  {!tutarEslesti && hedefTutar > 0 && (
                    <p className="text-xs text-red-500 mt-1.5 text-center">
                      Toplam ₺{formatPara(fark)} {toplamTaksit > hedefTutar ? 'fazla' : 'eksik'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- KK: Ekstre Kes Modal ---
function EkstreFormu({ hesap, harcamalar, donemHareketler, seciliDonem, onKapat, onKayit }) {
  const bekleyenPesin = harcamalar.filter(h => !h.ekstre_kesildi && h.harcama_tipi === 'pesin')
  const donemOdenmemis = donemHareketler.filter(r => !r.odendi && r.tutar > 0)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const toplamTutar = [...bekleyenPesin, ...donemOdenmemis].reduce((s, r) => s + (r.tutar || 0), 0)
  const hicKayitYok = bekleyenPesin.length === 0 && donemOdenmemis.length === 0

  const kesEkstre = async () => {
    if (hicKayitYok) return
    setKaydediliyor(true)
    const bugun = new Date().toISOString().split('T')[0]
    const donem = seciliDonem || (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
    const giderler = []

    // 1. Bekleyen peşin harcamaları borc_kalemler'e ekle + ödendi işaretle
    if (bekleyenPesin.length > 0) {
      const yeniKalemler = bekleyenPesin.map(h => ({
        hesap_id: hesap.id,
        tarih: bugun,
        donem,
        tutar: h.tutar,
        kategori: h.kategori || null,
        aciklama: h.aciklama || 'Ekstre',
        tur: 'ekstre',
        odendi: true,
        grup_id: crypto.randomUUID(),
      }))
      await supabase.from('borc_kalemler').insert(yeniKalemler)
      await supabase.from('borc_harcamalar')
        .update({ ekstre_kesildi: true })
        .in('id', bekleyenPesin.map(h => h.id))
      yeniKalemler.forEach(k => giderler.push(k))
    }

    // 2. Dönemin ödenmemiş taksitlerini ödendi olarak işaretle
    if (donemOdenmemis.length > 0) {
      await supabase.from('borc_kalemler')
        .update({ odendi: true })
        .in('id', donemOdenmemis.map(r => r.id))
      donemOdenmemis.forEach(r => giderler.push(r))
    }

    // 3. Hepsini giderler tablosuna ekle
    if (giderler.length > 0) {
      await supabase.from('giderler').insert(giderler.map(r => ({
        tarih: r.tarih,
        donem: r.donem,
        kategori: r.kategori || 'Borç',
        k: r.tutar,
        hesap: 'K',
        aciklama: `${hesap.ad}${r.aciklama ? ' · ' + r.aciklama : ''}`,
      })))
    }

    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✂️ Ekstre Kes — {hesap.ad}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {donemOdenmemis.length} taksit + {bekleyenPesin.length} bekleyen · ₺{formatPara(toplamTutar)} toplam
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {hicKayitYok ? (
            <p className="text-center text-slate-400 text-sm py-6">Bu dönemde işlenecek kayıt yok.</p>
          ) : (
            <>
              {donemOdenmemis.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">📅 Bu Dönemin Taksitleri</p>
                  <div className="space-y-2">
                    {donemOdenmemis.map(r => (
                      <div key={r.id} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{r.aciklama || '—'}</p>
                          {r.kategori && <p className="text-xs text-slate-400">{r.kategori}</p>}
                        </div>
                        <p className="text-sm font-bold text-purple-700 flex-shrink-0">₺{formatPara(r.tutar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bekleyenPesin.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">⏳ Bekleyen Peşin Harcamalar</p>
                  <div className="space-y-2">
                    {bekleyenPesin.map(h => (
                      <div key={h.id} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{h.aciklama || '—'}</p>
                          {h.kategori && <p className="text-xs text-slate-400">{h.kategori}</p>}
                        </div>
                        <p className="text-sm font-bold text-orange-600 flex-shrink-0">₺{formatPara(h.tutar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <p className="text-sm text-slate-600">Toplam Gider</p>
                <p className="text-base font-bold text-slate-800">₺{formatPara(toplamTutar)}</p>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
          <button onClick={kesEkstre} disabled={kaydediliyor || hicKayitYok}
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
  const [aktifBakiyeler, setAktifBakiyeler] = useState({}) // hesap_id → { bakiye, guncel, toplam }
  const [form, setForm] = useState(null) // null | 'hesap' | 'duzenle-hesap' | 'alode' | 'harcama' | 'ekstre'
  const [duzenleKalem, setDuzenleKalem] = useState(null)
  const [duzenleHarcama, setDuzenleHarcama] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukleHesaplar = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: aktif }, { data: gecmis }] = await Promise.all([
      supabase.from('borc_hesaplar').select('*').eq('aktif', true).order('created_at'),
      supabase.from('borc_hesaplar').select('*').eq('aktif', false).order('created_at'),
    ])
    const aHesaplar = aktif || []
    setHesaplar(aHesaplar)

    // Aktif hesapların bakiyelerini yükle
    if (aHesaplar.length > 0) {
      const buAyVal = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
      const bakiyeMap = {}
      await Promise.all(aHesaplar.map(async (h) => {
        const [{ data: kalemler }, { data: harcamalar }] = await Promise.all([
          supabase.from('borc_kalemler').select('tutar, odendi, donem').eq('hesap_id', h.id),
          h.tip === 'kk'
            ? supabase.from('borc_harcamalar').select('tutar, ekstre_kesildi').eq('hesap_id', h.id)
            : Promise.resolve({ data: [] }),
        ])
        const k = kalemler || []
        const bekleyenToplam = (harcamalar || [])
          .filter(r => !r.ekstre_kesildi).reduce((s, r) => s + (r.tutar || 0), 0)

        if (h.tip === 'kk') {
          const toplam = k.filter(r => !r.odendi).reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
          const guncel = k.filter(r => !r.odendi && r.donem === buAyVal).reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
          bakiyeMap[h.id] = { bakiye: toplam, guncel, toplam }
        } else {
          const bak = k.reduce((s, r) => s + (r.tutar || 0), 0)
          bakiyeMap[h.id] = { bakiye: bak, guncel: null, toplam: null }
        }
      }))
      setAktifBakiyeler(bakiyeMap)
    }

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

  const toggleOdendi = async (id, mevcutDurum) => {
    await supabase.from('borc_kalemler').update({ odendi: !mevcutDurum }).eq('id', id)
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

  const [seciliDonem, setSeciliDonem] = useState(null) // null = tümü

  // Hesap değişince: KK ise bu ayı seç, kişi ise tümünü göster
  useEffect(() => {
    if (!secili) return
    const hesap = hesaplar.find(h => h.id === secili.id)
    if (hesap?.tip === 'kk') {
      const n = new Date()
      setSeciliDonem(n.getFullYear() * 100 + n.getMonth() + 1)
    } else {
      setSeciliDonem(null)
    }
  }, [secili, hesaplar])

  const seciliHesap = hesaplar.find(h => h.id === secili?.id) || null
  const sembol = seciliHesap ? (SEMBOL[seciliHesap.doviz_cinsi] || seciliHesap.doviz_cinsi) : '₺'
  const bekleyenSayisi = harcamalar.filter(h => !h.ekstre_kesildi).length
  const bekleyenToplam = harcamalar.filter(h => !h.ekstre_kesildi).reduce((s, h) => s + (h.tutar || 0), 0)

  // Bakiye: sadece ödenmemiş kalemler
  const bakiye = hareketler.filter(r => !r.odendi).reduce((s, r) => s + (r.tutar || 0), 0)

  // KK özet hesapları
  const buAy = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
  const guncelBorc = hareketler
    .filter(r => !r.odendi && r.donem === buAy)
    .reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
  const toplamBorc = bakiye + bekleyenToplam

  // Dönem listesi (hareketlerdeki + 12 ay ileri)
  const donemler = (() => {
    const set = new Set(hareketler.map(r => r.donem).filter(Boolean))
    const now = new Date()
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      set.add(d.getFullYear() * 100 + d.getMonth() + 1)
    }
    return Array.from(set).sort((a, b) => a - b)
  })()

  const donemLabel = (d) => {
    const y = Math.floor(d / 100), m = d % 100
    return `${y}/${String(m).padStart(2, '0')}`
  }

  // Filtrelenmiş hareketler
  const gosterilecekHareketler = seciliDonem
    ? hareketler.filter(r => r.donem === seciliDonem)
    : hareketler

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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[...hesaplar].sort((a, b) => (a.tip === 'kk' ? -1 : 1) - (b.tip === 'kk' ? -1 : 1)).map(h => {
            const isSecili = secili?.id === h.id
            const detay = aktifBakiyeler[h.id] || { bakiye: 0, guncel: null, toplam: null }
            const bak = detay.bakiye
            const sem = SEMBOL[h.doviz_cinsi] || h.doviz_cinsi

            // Renk belirleme
            let bg, border, text
            if (h.tip === 'kk') {
              bg = isSecili ? 'bg-blue-600' : 'bg-blue-50'
              border = isSecili ? 'border-blue-600' : 'border-blue-200'
              text = isSecili ? 'text-white' : 'text-blue-800'
            } else if (bak > 0) {
              bg = isSecili ? 'bg-red-500' : 'bg-red-50'
              border = isSecili ? 'border-red-500' : 'border-red-200'
              text = isSecili ? 'text-white' : 'text-red-800'
            } else if (bak < 0) {
              bg = isSecili ? 'bg-green-600' : 'bg-green-50'
              border = isSecili ? 'border-green-600' : 'border-green-200'
              text = isSecili ? 'text-white' : 'text-green-800'
            } else {
              bg = isSecili ? 'bg-slate-600' : 'bg-slate-50'
              border = isSecili ? 'border-slate-600' : 'border-slate-200'
              text = isSecili ? 'text-white' : 'text-slate-700'
            }
            const subText = isSecili ? 'opacity-75' : 'opacity-60'

            return (
              <button key={h.id} onClick={() => setSecili(h)}
                className={`rounded-2xl p-3 text-left w-full transition-all border-2 shadow-sm ${bg} ${border} ${text}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  {h.tip === 'kk'
                    ? <CreditCard size={13} className="flex-shrink-0" />
                    : <User size={13} className="flex-shrink-0" />}
                  <span className="text-xs font-semibold truncate">{h.ad}</span>
                </div>
                {/* Özet bakiye */}
                {h.tip === 'kk' && detay.guncel !== null ? (
                  <div className="space-y-1 mt-1">
                    <div>
                      <p className={`text-xs ${subText}`}>Güncel</p>
                      <p className="text-sm font-bold leading-tight">{sem}{formatPara(detay.guncel)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${subText}`}>Toplam</p>
                      <p className="text-sm font-bold leading-tight">{sem}{formatPara(detay.toplam)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-base font-bold leading-tight">{sem}{formatPara(Math.abs(bak))}</p>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                      {bak > 0 ? 'Borç' : bak < 0 ? 'Alacak' : 'Kapalı'}
                    </p>
                  </>
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
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-500">
                {seciliHesap.tip === 'kk' ? '💳 Kredi Kartı' : '👤 Kişi'} — {seciliHesap.ad}
                {seciliHesap.tip === 'kk' && seciliHesap.ekstre_gun && (
                  <span className="ml-1 text-slate-400">· Ekstre: {seciliHesap.ekstre_gun}. gün</span>
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setForm('duzenle-hesap')} title="Hesabı düzenle"
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={kapatHesap} title="Hesabı kapat (geçmişe taşı)"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-400 hover:border-red-200 hover:text-red-400 transition-colors">
                  Kapat
                </button>
              </div>
            </div>

            {seciliHesap.tip === 'kk' ? (
              /* KK: Güncel borç + Toplam borç */
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-xs text-slate-400 mb-1">Bu Ay Borcu</p>
                  <p className="text-lg font-bold text-purple-700">{sembol}{formatPara(guncelBorc)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Taksit + Bekleyen</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-xs text-slate-400 mb-1">Toplam Borç</p>
                  <p className="text-lg font-bold text-red-600">{sembol}{formatPara(toplamBorc)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tüm ödenmemiş</p>
                </div>
              </div>
            ) : (
              /* Kişi: tek bakiye */
              <div>
                <p className={`text-2xl font-bold ${bakiye > 0 ? 'text-red-600' : bakiye < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {sembol}{formatPara(Math.abs(bakiye))}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bakiye > 0 ? '🔴 Borç var' : bakiye < 0 ? '🟢 Alacak var' : 'Kapalı'}
                </p>
              </div>
            )}

            {/* KK - Bekleyen harcama uyarısı */}
            {seciliHesap.tip === 'kk' && bekleyenSayisi > 0 && (
              <div className="mt-3 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-orange-700 font-medium">
                  {bekleyenSayisi} bekleyen · {sembol}{formatPara(bekleyenToplam)}
                </p>
                <button onClick={() => setForm('ekstre')}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                  <Scissors size={11} /> Kes
                </button>
              </div>
            )}

            {/* KK - Ekstre dönemi seçici */}
            {seciliHesap.tip === 'kk' && donemler.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-slate-500 flex-shrink-0">Ekstre Dönemi:</label>
                <select value={seciliDonem || ''} onChange={e => setSeciliDonem(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Tümü</option>
                  {donemler.map(d => (
                    <option key={d} value={d}>
                      {donemLabel(d)}{d === buAy ? ' (Bu Ay)' : ''}
                    </option>
                  ))}
                </select>
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-slate-700">{h.kategori || '—'}</span>
                        {h.harcama_tipi === 'taksitli' && (
                          <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-full flex-shrink-0">{h.taksit_sayisi} Taksit</span>
                        )}
                      </div>
                      {h.aciklama && <p className="text-xs text-slate-500 truncate">{h.aciklama}</p>}
                      <p className="text-xs text-slate-400">{formatTarih(h.tarih)}</p>
                    </div>
                    <p className="text-sm font-bold text-orange-600 flex-shrink-0">₺{formatPara(h.tutar)}</p>
                    <button onClick={() => setDuzenleHarcama(h)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors flex-shrink-0">
                      <Pencil size={14} />
                    </button>
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
          <p className="text-xs font-semibold text-slate-500 mb-2 px-1">
            📝 Hareketler {seciliDonem ? `— ${donemLabel(seciliDonem)}` : ''}
          </p>
          {gosterilecekHareketler.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Bu dönemde hareket yok.</div>
          ) : (
            <div className="space-y-2">
              {gosterilecekHareketler.map(r => (
                <div key={r.id} className={`rounded-xl px-4 py-3 shadow-sm border flex items-center gap-3 transition-colors ${r.odendi ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100'}`}>
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.odendi ? 'bg-green-300' : r.tutar > 0 ? 'bg-red-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium truncate ${r.odendi ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {r.aciklama || (r.tur === 'ekstre' ? 'Ekstre' : r.tur === 'taksit' ? 'Taksit' : r.tur === 'al' ? 'Alındı' : 'Ödendi')}
                      </span>
                      {r.kategori && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full flex-shrink-0">{r.kategori}</span>
                      )}
                      {r.taksit_no && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {r.taksit_no}/{r.taksit_toplam}
                        </span>
                      )}
                      {r.odendi && (
                        <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Ödendi</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{formatTarih(r.tarih)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${r.odendi ? 'text-slate-400' : r.tutar > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {r.tutar > 0 ? '+' : ''}{sembol}{formatPara(Math.abs(r.tutar))}
                    </p>
                  </div>
                  {seciliHesap?.tip === 'kk' && (
                    <button onClick={() => toggleOdendi(r.id, r.odendi)}
                      title={r.odendi ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${r.odendi ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'}`}>
                      {r.odendi && <span className="text-xs leading-none">✓</span>}
                    </button>
                  )}
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
      {duzenleHarcama && (
        <HarcamaDuzenleFormu harcama={duzenleHarcama}
          onKapat={() => setDuzenleHarcama(null)}
          onKayit={() => { setDuzenleHarcama(null); yukleDetay(seciliHesap.id) }} />
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
        <EkstreFormu
          hesap={seciliHesap}
          harcamalar={harcamalar}
          donemHareketler={seciliDonem ? hareketler.filter(r => r.donem === seciliDonem) : hareketler.filter(r => r.donem === buAy)}
          seciliDonem={seciliDonem || buAy}
          onKapat={() => setForm(null)}
          onKayit={yenile} />
      )}
    </div>
  )
}
