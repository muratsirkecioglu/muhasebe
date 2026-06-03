import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { buDonem, donemLabel, formatPara } from '../db'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Calendar, Landmark, Banknote, ArrowLeftRight } from 'lucide-react'

function TransferFormu({ onKapat, onKayit }) {
  const [yon, setYon] = useState('cek') // 'cek' = bankadan nakit çek, 'yukle' = nakiti bankaya yükle
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
      k: yon === 'yukle' ? t : 0,  // bankaya yüklenen
      n: yon === 'cek' ? t : 0,    // bankadan çekilen
    })
    onKayit(); onKapat()
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
                }`}>
                {label}
              </button>
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

function KartBilgi({ baslik, deger, alt, renk, Icon }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{baslik}</p>
          <p className={`text-2xl font-bold mt-1 ${renk}`}>{deger}</p>
          {alt && <p className="text-xs text-slate-400 mt-0.5">{alt}</p>}
        </div>
        <div className={`p-2 rounded-xl ${renk === 'text-green-600' ? 'bg-green-50' : renk === 'text-red-500' ? 'bg-red-50' : 'bg-blue-50'}`}>
          <Icon size={20} className={renk || 'text-blue-600'} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const donem = buDonem()
  const [gelirler, setGelirler] = useState([])
  const [giderler, setGiderler] = useState([])
  const [sonAylar, setSonAylar] = useState([])
  const [kategoriGrup, setKategoriGrup] = useState([])
  const [bakiye, setBakiye] = useState({ K: 0, N: 0 })
  const [transfer, setTransfer] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      setYukleniyor(true)
      const [{ data: gel }, { data: gid }] = await Promise.all([
        supabase.from('gelirler').select('*').eq('donem', donem),
        supabase.from('giderler').select('*').eq('donem', donem),
      ])
      setGelirler(gel || [])
      setGiderler(gid || [])

      // Kategori grupla
      const katMap = {}
      for (const r of gid || []) {
        katMap[r.kategori] = (katMap[r.kategori] || 0) + (r.k || 0)
      }
      setKategoriGrup(
        Object.entries(katMap)
          .map(([k, v]) => ({ kategori: k, tutar: v }))
          .sort((a, b) => b.tutar - a.tutar)
          .slice(0, 6)
      )

      // Son 6 ay
      const aylar = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const don = d.getFullYear() * 100 + d.getMonth() + 1
        const [{ data: g }, { data: gi }] = await Promise.all([
          supabase.from('gelirler').select('k').eq('donem', don),
          supabase.from('giderler').select('k').eq('donem', don),
        ])
        aylar.push({
          ay: donemLabel(don),
          gelir: (g || []).reduce((s, r) => s + (r.k || 0), 0),
          gider: (gi || []).reduce((s, r) => s + (r.k || 0), 0),
        })
      }
      setSonAylar(aylar)

      // Tüm zamanlı K/N bakiyesi
      const [{ data: tumGelir }, { data: tumGider }, { data: nkData }] = await Promise.all([
        supabase.from('gelirler').select('k, hesap'),
        supabase.from('giderler').select('k, hesap'),
        supabase.from('nk_transferler').select('k, n'),
      ])

      const bankaGelir = (tumGelir || []).filter(r => r.hesap !== 'N').reduce((s, r) => s + (r.k || 0), 0)
      const bankaGider = (tumGider || []).filter(r => r.hesap !== 'N').reduce((s, r) => s + (r.k || 0), 0)
      const nakitGelir = (tumGelir || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
      const nakitGider = (tumGider || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
      const nkBankayaYuklenen = (nkData || []).reduce((s, r) => s + (r.k || 0), 0)
      const nkBankadanCekilen = (nkData || []).reduce((s, r) => s + (r.n || 0), 0)

      setBakiye({
        K: bankaGelir - bankaGider - nkBankadanCekilen + nkBankayaYuklenen,
        N: nakitGelir - nakitGider + nkBankadanCekilen - nkBankayaYuklenen,
      })

      setYukleniyor(false)
    }
    yukle()
  }, [donem])

  const toplamGelir = gelirler.reduce((s, r) => s + (r.k || 0), 0)
  const toplamGider = giderler.reduce((s, r) => s + (r.k || 0), 0)
  const net = toplamGelir - toplamGider

  if (yukleniyor) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={18} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-700">{donemLabel(donem)} — Aylık Özet</h2>
      </div>

      {/* Banka / Nakit anlık bakiye */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Landmark size={16} className="opacity-70" />
            <p className="text-xs opacity-70">Banka (K)</p>
          </div>
          <p className="text-2xl font-bold">₺{formatPara(bakiye.K)}</p>
        </div>
        <div className="bg-slate-700 rounded-2xl p-4 text-white relative">
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={16} className="opacity-70" />
            <p className="text-xs opacity-70">Nakit (N)</p>
          </div>
          <p className="text-2xl font-bold">₺{formatPara(bakiye.N)}</p>
          <button onClick={() => setTransfer(true)}
            className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KartBilgi baslik="Gelir" deger={`₺${formatPara(toplamGelir)}`} renk="text-green-600" Icon={TrendingUp} />
        <KartBilgi baslik="Gider" deger={`₺${formatPara(toplamGider)}`} renk="text-red-500" Icon={TrendingDown} />
        <KartBilgi baslik="Net" deger={`₺${formatPara(net)}`} renk={net >= 0 ? 'text-blue-600' : 'text-orange-500'} Icon={Wallet} />
        <KartBilgi baslik="İşlem" deger={gelirler.length + giderler.length} alt="Bu ay" renk="text-slate-700" Icon={Calendar} />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-4">Son 6 Ay — Gelir / Gider</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sonAylar} barGap={4}>
            <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={v => `₺${formatPara(v)}`} />
            <Legend />
            <Bar dataKey="gelir" name="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gider" name="Gider" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {kategoriGrup.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Bu Ay — Gider Kategorileri</h3>
          <div className="space-y-2">
            {kategoriGrup.map(({ kategori, tutar }) => {
              const oran = toplamGider > 0 ? (tutar / toplamGider) * 100 : 0
              return (
                <div key={kategori}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{kategori}</span>
                    <span className="font-medium">₺{formatPara(tutar)}</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${oran}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {transfer && <TransferFormu onKapat={() => setTransfer(false)} onKayit={() => { setTransfer(false); window.location.reload() }} />}

      {!gelirler.length && !giderler.length && (
        <div className="text-center py-12 text-slate-400">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Bu ay henüz işlem yok.</p>
          <p className="text-xs mt-1">İşlemler sayfasından ekleyin veya Excel import edin.</p>
        </div>
      )}
    </div>
  )
}
