import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

const VARLIK_TURLERI = ['TL', 'Altın', 'GMS Altın', 'USD', 'EUR', 'GBP', 'USDT', 'İnşaat', 'Şirket', 'Büyükbaş Hayvan', 'Diğer']
const TUR_RENK = {
  'TL': 'bg-blue-100 text-blue-700',
  'Altın': 'bg-yellow-100 text-yellow-700',
  'GMS Altın': 'bg-amber-100 text-amber-700',
  'USD': 'bg-green-100 text-green-700',
  'EUR': 'bg-indigo-100 text-indigo-700',
  'GBP': 'bg-purple-100 text-purple-700',
  'İnşaat': 'bg-orange-100 text-orange-700',
  'Büyükbaş Hayvan': 'bg-red-100 text-red-700',
}

function EkleFormu({ onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tur: 'TL', alt_tip: '', miktar: '', islem_tl: '', kur: '', aciklama: '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('birikim_hareketler').insert({
      tarih: form.tarih, tur: form.tur,
      alt_tip: form.alt_tip || null,
      miktar: parseFloat(form.miktar) || 0,
      islem_tl: parseFloat(form.islem_tl) || 0,
      kur: parseFloat(form.kur) || null,
      aciklama: form.aciklama || null,
    })
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">💰 Birikim Hareketi Ekle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Varlık Türü</label>
            <select value={form.tur} onChange={e => setForm(f => ({ ...f, tur: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {VARLIK_TURLERI.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Alt Tip (Alış/Satış/Birikim)</label>
            <input type="text" value={form.alt_tip} onChange={e => setForm(f => ({ ...f, alt_tip: e.target.value }))}
              placeholder="Alış, Satış, Birikim..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Miktar (native: gr, $, €...)</label>
            <input type="number" step="any" value={form.miktar} onChange={e => setForm(f => ({ ...f, miktar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">TL Karşılığı</label>
            <input type="number" step="any" value={form.islem_tl} onChange={e => setForm(f => ({ ...f, islem_tl: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kur</label>
            <input type="number" step="any" value={form.kur} onChange={e => setForm(f => ({ ...f, kur: e.target.value }))}
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

export default function Birikim() {
  const [ekle, setEkle] = useState(false)
  const [hareketler, setHareketler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtreTur, setFiltreTur] = useState('Tümü')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const { data } = await supabase
      .from('birikim_hareketler')
      .select('*')
      .order('tarih', { ascending: false })
    setHareketler(data || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const sil = async (id) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('birikim_hareketler').delete().eq('id', id)
    yukle()
  }

  // Varlık türü bazlı özet
  const turOzet = hareketler.reduce((acc, r) => {
    if (!acc[r.tur]) acc[r.tur] = { miktar: 0, islem_tl: 0 }
    acc[r.tur].miktar += r.miktar || 0
    acc[r.tur].islem_tl += r.islem_tl || 0
    return acc
  }, {})

  const turler = ['Tümü', ...Object.keys(turOzet)]
  const filtrelenmis = filtreTur === 'Tümü' ? hareketler : hareketler.filter(r => r.tur === filtreTur)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Birikim & Yatırım</h2>
        <button onClick={() => setEkle(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> Ekle
        </button>
      </div>

      {/* Özet kartlar */}
      {Object.keys(turOzet).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {Object.entries(turOzet).map(([tur, ozet]) => (
            <div key={tur} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TUR_RENK[tur] || 'bg-slate-100 text-slate-600'}`}>{tur}</span>
              <p className="text-lg font-bold text-slate-800 mt-2">{formatPara(ozet.miktar)}</p>
              <p className="text-xs text-slate-400">₺{formatPara(Math.abs(ozet.islem_tl))} toplam</p>
            </div>
          ))}
        </div>
      )}

      {/* Tür filtresi */}
      {turler.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {turler.map(t => (
            <button key={t} onClick={() => setFiltreTur(t)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 border transition-colors ${
                filtreTur === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:border-blue-300'
              }`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Henüz kayıt yok. Import sayfasından Excel'i yükleyin.
        </div>
      ) : (
        <div className="space-y-2">
          {filtrelenmis.map(r => (
            <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TUR_RENK[r.tur] || 'bg-slate-100 text-slate-600'}`}>{r.tur}</span>
                  {r.alt_tip && <span className="text-xs text-slate-400">{r.alt_tip}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{new Date(r.tarih).toLocaleDateString('tr-TR')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${r.miktar >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {r.miktar >= 0 ? '+' : ''}{formatPara(r.miktar)}
                </p>
                {r.islem_tl !== 0 && (
                  <p className="text-xs text-slate-400">₺{formatPara(Math.abs(r.islem_tl))}</p>
                )}
                {r.kur && <p className="text-xs text-slate-300">Kur: {formatPara(Math.abs(r.kur))}</p>}
              </div>
              <button onClick={() => sil(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {ekle && <EkleFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
