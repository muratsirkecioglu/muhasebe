import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Trash2 } from 'lucide-react'

function EkleFormu({ onKapat, onKayit }) {
  const [form, setForm] = useState({ tarih: new Date().toISOString().split('T')[0], kisi: '', tur: 'borc', tutar: '', aciklama: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_alacak').insert({
      tarih: form.tarih, kisi: form.kisi, tur: form.tur,
      tutar: parseFloat(form.tutar) || 0, aciklama: form.aciklama, odendi: false,
    })
    onKayit()
    onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">📋 Borç / Alacak Ekle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tür</label>
            <div className="flex gap-2">
              {['borc', 'alacak'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tur: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tur === t
                      ? t === 'borc' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'
                      : 'border-slate-200 text-slate-400'
                  }`}>
                  {t === 'borc' ? '↑ Borç (Verdim)' : '↓ Alacak (Aldım)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kişi</label>
            <input type="text" value={form.kisi} onChange={e => setForm(f => ({ ...f, kisi: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" value={form.tutar} onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
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

export default function BorcAlacak() {
  const [ekle, setEkle] = useState(false)
  const [kayitlar, setKayitlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const { data } = await supabase.from('borc_alacak').select('*').order('tarih', { ascending: false })
    setKayitlar(data || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const toggle = async (id, odendi) => {
    await supabase.from('borc_alacak').update({ odendi: !odendi }).eq('id', id)
    yukle()
  }

  const sil = async (id) => {
    await supabase.from('borc_alacak').delete().eq('id', id)
    yukle()
  }

  const borclar = kayitlar.filter(r => r.tur === 'borc' && !r.odendi)
  const alacaklar = kayitlar.filter(r => r.tur === 'alacak' && !r.odendi)
  const toplamBorc = borclar.reduce((s, r) => s + r.tutar, 0)
  const toplamAlacak = alacaklar.reduce((s, r) => s + r.tutar, 0)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Borç / Alacak</h2>
        <button onClick={() => setEkle(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> Ekle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-xs text-red-400">Toplam Borç</p>
          <p className="text-xl font-bold text-red-600 mt-1">₺{formatPara(toplamBorc)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs text-green-500">Toplam Alacak</p>
          <p className="text-xl font-bold text-green-600 mt-1">₺{formatPara(toplamAlacak)}</p>
        </div>
      </div>

      {yukleniyor ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {kayitlar.map(r => (
            <div key={r.id} className={`bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3 ${r.odendi ? 'opacity-40' : ''}`}>
              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.tur === 'alacak' ? 'bg-green-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{r.kisi}</span>
                  {r.aciklama && <span className="text-xs text-slate-400 truncate">{r.aciklama}</span>}
                </div>
                <p className="text-xs text-slate-400">{new Date(r.tarih).toLocaleDateString('tr-TR')}</p>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${r.tur === 'alacak' ? 'text-green-600' : 'text-red-500'}`}>
                ₺{formatPara(r.tutar)}
              </p>
              <button onClick={() => toggle(r.id, r.odendi)}
                className={`text-xs px-2 py-1 rounded-lg border flex-shrink-0 ${r.odendi ? 'border-slate-200 text-slate-400' : 'border-blue-200 text-blue-500'}`}>
                {r.odendi ? 'Geri Al' : 'Ödendi'}
              </button>
              <button onClick={() => sil(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {ekle && <EkleFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
