import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Landmark, Banknote, ArrowLeftRight, PiggyBank } from 'lucide-react'

const TUR_RENK = {
  'TL':               'bg-blue-50 text-blue-700 border-blue-100',
  'Altın':            'bg-yellow-50 text-yellow-700 border-yellow-100',
  'GMS Altın':        'bg-amber-50 text-amber-700 border-amber-100',
  'USD':              'bg-green-50 text-green-700 border-green-100',
  'EUR':              'bg-indigo-50 text-indigo-700 border-indigo-100',
  'GBP':              'bg-purple-50 text-purple-700 border-purple-100',
  'USDT':             'bg-teal-50 text-teal-700 border-teal-100',
  'İnşaat':           'bg-orange-50 text-orange-700 border-orange-100',
  'Büyükbaş Hayvan':  'bg-red-50 text-red-700 border-red-100',
}

const TUR_BIRIM = {
  'Altın': 'gr', 'GMS Altın': 'gr',
  'USD': '$', 'EUR': '€', 'GBP': '£', 'USDT': '₮',
  'İnşaat': '₺', 'TL': '₺', 'Büyükbaş Hayvan': '₺',
}

function TransferFormu({ onKapat, onKayit }) {
  const [yon, setYon] = useState('cek')
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const t = parseFloat(tutar) || 0
    const d = new Date(tarih)
    const donem = d.getFullYear() * 100 + d.getMonth() + 1
    await supabase.from('nk_transferler').insert({
      tarih, donem,
      k: yon === 'yukle' ? t : 0,
      n: yon === 'cek' ? t : 0,
    })
    onKayit()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">🔄 Banka ↔ Nakit Transfer</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['cek', '🏦→💵 Bankadan Çek'], ['yukle', '💵→🏦 Bankaya Yükle']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setYon(val)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  yon === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                }`}>{label}</button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" value={tutar} onChange={e => setTutar(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div className="flex gap-3">
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

export default function Dashboard() {
  const [bakiye, setBakiye] = useState({ K: 0, N: 0 })
  const [birikimOzet, setBirikimOzet] = useState({})
  const [transfer, setTransfer] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = async () => {
    setYukleniyor(true)

    const [{ data: tumGelir }, { data: tumGider }, { data: nkData }, { data: birikimData }] = await Promise.all([
      supabase.from('gelirler').select('k, hesap'),
      supabase.from('giderler').select('k, hesap'),
      supabase.from('nk_transferler').select('k, n'),
      supabase.from('birikim_hareketler').select('tur, miktar'),
    ])

    // Banka bakiyesi
    const bankaGelir = (tumGelir || []).filter(r => r.hesap !== 'N').reduce((s, r) => s + (r.k || 0), 0)
    const bankaGider = (tumGider || []).filter(r => r.hesap !== 'N').reduce((s, r) => s + (r.k || 0), 0)
    const nakitGelir = (tumGelir || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
    const nakitGider = (tumGider || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
    const nkYuklenen = (nkData || []).reduce((s, r) => s + (r.k || 0), 0)
    const nkCekilen = (nkData || []).reduce((s, r) => s + (r.n || 0), 0)

    setBakiye({
      K: bankaGelir - bankaGider - nkCekilen + nkYuklenen,
      N: nakitGelir - nakitGider + nkCekilen - nkYuklenen,
    })

    // Birikim özeti — tur bazlı net miktar
    const ozet = {}
    for (const r of birikimData || []) {
      ozet[r.tur] = (ozet[r.tur] || 0) + (r.miktar || 0)
    }
    setBirikimOzet(ozet)
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  if (yukleniyor) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

      {/* Hesap Bakiyeleri */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hesap Bakiyesi</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={16} className="opacity-70" />
              <p className="text-xs opacity-70 font-medium">Banka (K)</p>
            </div>
            <p className="text-3xl font-bold">₺{formatPara(bakiye.K)}</p>
          </div>
          <div className="bg-slate-700 rounded-2xl p-5 text-white relative">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={16} className="opacity-70" />
              <p className="text-xs opacity-70 font-medium">Nakit (N)</p>
            </div>
            <p className="text-3xl font-bold">₺{formatPara(bakiye.N)}</p>
            <button onClick={() => setTransfer(true)}
              title="Transfer"
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
              <ArrowLeftRight size={14} />
            </button>
          </div>
        </div>
        <div className="mt-2 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm flex justify-between items-center">
          <span className="text-sm text-slate-500">Toplam TL Varlık</span>
          <span className="text-base font-bold text-slate-800">₺{formatPara(bakiye.K + bakiye.N)}</span>
        </div>
      </div>

      {/* Birikim Bakiyeleri */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank size={15} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Birikim & Yatırım</h2>
        </div>
        {Object.keys(birikimOzet).length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Henüz birikim kaydı yok. Import sayfasından Excel yükleyin.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(birikimOzet)
              .filter(([, miktar]) => miktar !== 0)
              .sort(([a], [b]) => a.localeCompare(b, 'tr'))
              .map(([tur, miktar]) => {
                const birim = TUR_BIRIM[tur] || ''
                const renk = TUR_RENK[tur] || 'bg-slate-50 text-slate-700 border-slate-100'
                return (
                  <div key={tur} className={`rounded-2xl p-4 border ${renk}`}>
                    <p className="text-xs font-semibold opacity-70 mb-1">{tur}</p>
                    <p className="text-xl font-bold">
                      {birim !== '₺' ? `${formatPara(miktar)} ${birim}` : `₺${formatPara(miktar)}`}
                    </p>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {transfer && (
        <TransferFormu
          onKapat={() => setTransfer(false)}
          onKayit={() => { setTransfer(false); yukle() }}
        />
      )}
    </div>
  )
}
