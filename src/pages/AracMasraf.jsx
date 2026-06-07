import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, yerelTarih } from '../db'
import { Plus, Trash2, Fuel, ParkingCircle, Waves } from 'lucide-react'
import TarihInput from '../components/TarihInput'

const KATEGORILER = ['Yakıt', 'HGS', 'Otopark', 'Yıkama', 'Sigorta', 'MTV', 'Servis', 'Lastik', 'Diğer']
const IKONLAR = { Yakıt: Fuel, Otopark: ParkingCircle, Yıkama: Waves }

// İşlemler ekranı, giderler+gelirler'i dönem bazında birleşik liste olarak gösterip
// sira'yı bu havuz üzerinden yönetiyor — yeni kayıt iki tabloda görülen en yüksek
// sira değerinden bir fazlasını alır (en üstte görünür, mevcut kayıtlar update görmez).
async function islemSiraGetir(donem) {
  const [{ data: gel }, { data: gid }] = await Promise.all([
    supabase.from('gelirler').select('sira').eq('donem', donem).order('sira', { ascending: false }).limit(1),
    supabase.from('giderler').select('sira').eq('donem', donem).order('sira', { ascending: false }).limit(1),
  ])
  return Math.max(gel?.[0]?.sira ?? -1, gid?.[0]?.sira ?? -1) + 1
}

function EkleFormu({ onKapat, onKayit }) {
  const [form, setForm] = useState({ tarih: yerelTarih(new Date()), kategori: 'Yakıt', tutar: '', aciklama: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const tarih = new Date(form.tarih)
    const donem = tarih.getFullYear() * 100 + tarih.getMonth() + 1
    await supabase.from('giderler').insert({
      tarih: form.tarih, donem,
      kategori: `Araç - ${form.kategori}`,
      k: parseFloat(form.tutar) || 0,
      aciklama: form.aciklama,
      sira: await islemSiraGetir(donem),
    })
    onKayit()
    onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">🚗 Araç Masrafı Ekle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {KATEGORILER.map(k => <option key={k}>{k}</option>)}
            </select>
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

export default function AracMasraf() {
  const [ekle, setEkle] = useState(false)
  const [masraflar, setMasraflar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const { data } = await supabase.from('giderler')
      .select('*')
      .like('kategori', 'Araç - %')
      .order('tarih', { ascending: false })
    setMasraflar(data || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const sil = async (id) => {
    await supabase.from('giderler').delete().eq('id', id)
    yukle()
  }

  const ozet = masraflar.reduce((acc, r) => {
    const kat = r.kategori.replace('Araç - ', '')
    acc[kat] = (acc[kat] || 0) + r.k
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">🚗 Araç Masrafları</h2>
        <button onClick={() => setEkle(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> Ekle
        </button>
      </div>

      {Object.keys(ozet).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {Object.entries(ozet).map(([kat, toplam]) => {
            const Icon = IKONLAR[kat]
            return (
              <div key={kat} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 flex items-center gap-1">{Icon && <Icon size={12} />} {kat}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">₺{formatPara(toplam)}</p>
              </div>
            )
          })}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {masraflar.map(r => (
            <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{r.kategori.replace('Araç - ', '')}</span>
                  {r.aciklama && <span className="text-xs text-slate-400">{r.aciklama}</span>}
                </div>
                <p className="text-xs text-slate-400">{formatTarih(r.tarih)}</p>
              </div>
              <p className="text-sm font-bold text-orange-500">₺{formatPara(r.k)}</p>
              <button onClick={() => sil(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {ekle && <EkleFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
