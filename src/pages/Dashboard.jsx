import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Landmark, Banknote, ArrowLeftRight, PiggyBank, Settings } from 'lucide-react'

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

function BaslangicFormu({ mevcutBanka, mevcutNakit, onKapat, onKayit }) {
  const [banka, setBanka] = useState(mevcutBanka)
  const [nakit, setNakit] = useState(mevcutNakit)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await Promise.all([
      supabase.from('ayarlar').upsert({ anahtar: 'baslangic_banka', deger: parseFloat(banka) || 0 }),
      supabase.from('ayarlar').upsert({ anahtar: 'baslangic_nakit', deger: parseFloat(nakit) || 0 }),
    ])
    onKayit()
    onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">⚙️ Başlangıç Bakiyesi</h3>
          <p className="text-xs text-slate-400 mt-1">Şu anki gerçek bakiyelerinizi girin.</p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">🏦 Banka Bakiyesi (₺)</label>
            <input type="number" step="0.01" value={banka} onChange={e => setBanka(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">💵 Nakit Bakiyesi (₺)</label>
            <input type="number" step="0.01" value={nakit} onChange={e => setNakit(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
            Bu değerler sabit başlangıç noktası olarak kaydedilir. Bundan sonra yapacağınız gelir/gider/transfer işlemleri bu bakiyelere eklenir/çıkarılır.
          </p>
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
  const [bakiye, setBakiye] = useState({ K: 0, N: 0, TL: 0 })
  const [baslangic, setBaslangic] = useState({ banka: 0, nakit: 0 })
  const [birikimOzet, setBirikimOzet] = useState({})
  const [transfer, setTransfer] = useState(false)
  const [baslangicFormu, setBaslangicFormu] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = async () => {
    setYukleniyor(true)

    const [{ data: ayarlarData }, { data: gelirData }, { data: giderData }, { data: nkData }, { data: birikimData }] = await Promise.all([
      supabase.from('ayarlar').select('anahtar, deger'),
      supabase.from('gelirler').select('k, hesap'),
      supabase.from('giderler').select('k, hesap'),
      supabase.from('nk_transferler').select('k, n'),
      supabase.from('birikim_hareketler').select('tur, miktar'),
    ])

    // Başlangıç bakiyeleri
    const ayarMap = {}
    for (const a of ayarlarData || []) ayarMap[a.anahtar] = a.deger
    const baslangicBanka = ayarMap['baslangic_banka'] || 0
    const baslangicNakit = ayarMap['baslangic_nakit'] || 0
    setBaslangic({ banka: baslangicBanka, nakit: baslangicNakit })

    // K/N ayrımına göre tüm hareketler
    const bankaGelir = (gelirData || []).filter(r => r.hesap === 'K').reduce((s, r) => s + (r.k || 0), 0)
    const bankaGider = (giderData || []).filter(r => r.hesap === 'K').reduce((s, r) => s + (r.k || 0), 0)
    const nakitGelir = (gelirData || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
    const nakitGider = (giderData || []).filter(r => r.hesap === 'N').reduce((s, r) => s + (r.k || 0), 0)
    const nkYuklenen = (nkData || []).reduce((s, r) => s + (r.k || 0), 0)
    const nkCekilen  = (nkData || []).reduce((s, r) => s + (r.n || 0), 0)

    const bankaK = baslangicBanka + bankaGelir - bankaGider - nkCekilen + nkYuklenen
    const nakitN = baslangicNakit + nakitGelir - nakitGider + nkCekilen - nkYuklenen

    // Birikim özeti
    const ozet = {}
    for (const r of birikimData || []) {
      ozet[r.tur] = (ozet[r.tur] || 0) + (r.miktar || 0)
    }

    // TL toplam
    const TL_DAHIL = ['TL', 'İnşaat', 'Büyükbaş Hayvan', 'Borç Alacak', 'Şirketi Hayriyye', 'Palandora', 'Alım Satım']
    const birikimTL = TL_DAHIL.reduce((s, tur) => s + (ozet[tur] || 0), 0)

    setBakiye({ K: bankaK, N: nakitN, TL: bankaK + nakitN + birikimTL })
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Hesap Bakiyesi</h2>
          <button onClick={() => setBaslangicFormu(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors">
            <Settings size={13} /> Başlangıç Bakiyesi
          </button>
        </div>
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
            <button onClick={() => setTransfer(true)} title="Transfer"
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
              <ArrowLeftRight size={14} />
            </button>
          </div>
        </div>
        <div className="mt-2 bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-slate-300">Toplam TL Varlık</span>
          <span className="text-lg font-bold text-white">₺{formatPara(bakiye.TL)}</span>
        </div>
      </div>

      {/* Döviz Varlıkları */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank size={15} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Döviz & Fiziki Varlıklar</h2>
        </div>
        {[
          { tur: 'Altın Fiziki', birim: 'gr', emoji: '🥇', renk: 'bg-yellow-50 border-yellow-100 text-yellow-800' },
          { tur: 'Altın Banka',  birim: 'gr', emoji: '🏦', renk: 'bg-amber-50 border-amber-100 text-amber-800' },
          { tur: 'GMS/Gümüş',   birim: 'gr', emoji: '🪙', renk: 'bg-slate-50 border-slate-200 text-slate-700' },
          { tur: 'USD',          birim: '$',  emoji: '💵', renk: 'bg-green-50 border-green-100 text-green-800' },
          { tur: 'EUR',          birim: '€',  emoji: '💶', renk: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
          { tur: 'GBP',          birim: '£',  emoji: '💷', renk: 'bg-purple-50 border-purple-100 text-purple-800' },
        ].filter(v => birikimOzet[v.tur] && birikimOzet[v.tur] !== 0).length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Henüz varlık kaydı yok.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { tur: 'Altın Fiziki', birim: 'gr', emoji: '🥇', renk: 'bg-yellow-50 border-yellow-100 text-yellow-800' },
              { tur: 'Altın Banka',  birim: 'gr', emoji: '🏦', renk: 'bg-amber-50 border-amber-100 text-amber-800' },
              { tur: 'GMS/Gümüş',   birim: 'gr', emoji: '🪙', renk: 'bg-slate-50 border-slate-200 text-slate-700' },
              { tur: 'USD',          birim: '$',  emoji: '💵', renk: 'bg-green-50 border-green-100 text-green-800' },
              { tur: 'EUR',          birim: '€',  emoji: '💶', renk: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
              { tur: 'GBP',          birim: '£',  emoji: '💷', renk: 'bg-purple-50 border-purple-100 text-purple-800' },
            ].filter(v => birikimOzet[v.tur] && birikimOzet[v.tur] !== 0).map(v => (
              <div key={v.tur} className={`rounded-2xl p-4 border ${v.renk}`}>
                <p className="text-xs font-semibold opacity-60 mb-1">{v.emoji} {v.tur}</p>
                <p className="text-xl font-bold">{formatPara(birikimOzet[v.tur])} {v.birim}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {transfer && <TransferFormu onKapat={() => setTransfer(false)} onKayit={() => { setTransfer(false); yukle() }} />}
      {baslangicFormu && (
        <BaslangicFormu
          mevcutBanka={baslangic.banka}
          mevcutNakit={baslangic.nakit}
          onKapat={() => setBaslangicFormu(false)}
          onKayit={yukle}
        />
      )}
    </div>
  )
}
