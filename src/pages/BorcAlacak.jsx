import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Trash2, History, PenLine } from 'lucide-react'

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
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">📋 Yeni Borç / Alacak</h3>
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
                  {t === 'borc' ? '↑ Borç (Aldım)' : '↓ Alacak (Verdim)'}
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
  const [sekme, setSekme] = useState('guncel') // 'guncel' | 'gecmis'
  const [kayitlar, setKayitlar] = useState([])
  const [hareketler, setHareketler] = useState([])
  const [filtre, setFiltre] = useState('Tümü')
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: k }, { data: h }] = await Promise.all([
      supabase.from('borc_alacak').select('*').order('tarih', { ascending: false }),
      supabase.from('borc_hareketler').select('*').order('tarih', { ascending: false }),
    ])
    setKayitlar(k || [])
    setHareketler(h || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const toggle = async (id, odendi) => {
    await supabase.from('borc_alacak').update({ odendi: !odendi }).eq('id', id)
    yukle()
  }
  const sil = async (id, tablo) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from(tablo).delete().eq('id', id)
    yukle()
  }

  // Kişi listesi (geçmiş hareketlerden)
  const kisiler = ['Tümü', ...new Set(hareketler.map(r => r.kisi))]

  // Kişi bazlı özet (geçmiş)
  const kisiOzet = hareketler.reduce((acc, r) => {
    if (!acc[r.kisi]) acc[r.kisi] = { alindi: 0, odendi: 0 }
    if (r.hareket_tipi === 'alindi') acc[r.kisi].alindi += r.tutar || 0
    else acc[r.kisi].odendi += r.tutar || 0
    return acc
  }, {})

  const filtreliHareketler = filtre === 'Tümü' ? hareketler : hareketler.filter(r => r.kisi === filtre)

  // Güncel özet
  const aktifBorclar = kayitlar.filter(r => r.tur === 'borc' && !r.odendi)
  const aktifAlacaklar = kayitlar.filter(r => r.tur === 'alacak' && !r.odendi)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Borç / Alacak</h2>
        <button onClick={() => setEkle(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> Ekle
        </button>
      </div>

      {/* Sekme */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setSekme('guncel')}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
            sekme === 'guncel' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
          }`}>
          <PenLine size={14} /> Güncel
        </button>
        <button onClick={() => setSekme('gecmis')}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
            sekme === 'gecmis' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
          }`}>
          <History size={14} /> Geçmiş ({hareketler.length})
        </button>
      </div>

      {/* GÜNCEL sekme */}
      {sekme === 'guncel' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-xs text-red-400">Toplam Borç (Aldım)</p>
              <p className="text-xl font-bold text-red-600 mt-1">₺{formatPara(aktifBorclar.reduce((s, r) => s + r.tutar, 0))}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-xs text-green-500">Toplam Alacak (Verdim)</p>
              <p className="text-xl font-bold text-green-600 mt-1">₺{formatPara(aktifAlacaklar.reduce((s, r) => s + r.tutar, 0))}</p>
            </div>
          </div>
          {yukleniyor ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
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
                    <p className="text-xs text-slate-400">{r.tarih ? new Date(r.tarih).toLocaleDateString('tr-TR') : '—'}</p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${r.tur === 'alacak' ? 'text-green-600' : 'text-red-500'}`}>₺{formatPara(r.tutar)}</p>
                  <button onClick={() => toggle(r.id, r.odendi)}
                    className={`text-xs px-2 py-1 rounded-lg border flex-shrink-0 ${r.odendi ? 'border-slate-200 text-slate-400' : 'border-blue-200 text-blue-500'}`}>
                    {r.odendi ? 'Geri Al' : 'Ödendi'}
                  </button>
                  <button onClick={() => sil(r.id, 'borc_alacak')} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              ))}
              {kayitlar.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">Kayıt yok. Ekle butonundan yeni kayıt girebilirsiniz.</div>}
            </div>
          )}
        </>
      )}

      {/* GEÇMİŞ sekme */}
      {sekme === 'gecmis' && (
        <>
          {/* Kişi özet kartlar */}
          {Object.keys(kisiOzet).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(kisiOzet).map(([kisi, oz]) => {
                const kalan = oz.alindi - oz.odendi
                return (
                  <div key={kisi} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:border-blue-200"
                    onClick={() => setFiltre(f => f === kisi ? 'Tümü' : kisi)}>
                    <p className="text-xs font-medium text-slate-600 truncate">{kisi}</p>
                    <p className={`text-base font-bold mt-1 ${kalan > 0 ? 'text-red-500' : 'text-green-600'}`}>₺{formatPara(Math.abs(kalan))}</p>
                    <p className="text-xs text-slate-400">{kalan > 0 ? 'Borç kaldı' : 'Kapandı'}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Filtre */}
          {kisiler.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {kisiler.map(k => (
                <button key={k} onClick={() => setFiltre(k)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 border ${
                    filtre === k ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
                  }`}>{k}</button>
              ))}
            </div>
          )}

          {yukleniyor ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {filtreliHareketler.map(r => (
                <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.hareket_tipi === 'alindi' ? 'bg-red-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-slate-800">{r.kisi}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${r.hareket_tipi === 'alindi' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                        {r.hareket_tipi === 'alindi' ? 'Alındı' : 'Ödendi'}
                      </span>
                      {r.aciklama && <span className="text-xs text-slate-400 truncate">{r.aciklama}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">{r.tarih ? new Date(r.tarih).toLocaleDateString('tr-TR') : '—'}</p>
                      {r.doviz_miktar && <p className="text-xs text-slate-400">{r.doviz_miktar} {r.doviz_birim}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${r.hareket_tipi === 'alindi' ? 'text-red-500' : 'text-green-600'}`}>
                    ₺{formatPara(r.tutar)}
                  </p>
                  <button onClick={() => sil(r.id, 'borc_hareketler')} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              ))}
              {filtreliHareketler.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">Kayıt yok. Import sayfasından Excel'i yükleyin.</div>
              )}
            </div>
          )}
        </>
      )}

      {ekle && <EkleFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
