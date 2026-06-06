import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatPara, donemLabel, buDonem } from '../db'
import { useMask } from '../MaskContext'

const BASLANGIC_DONEM = 201604
const BASLANGIC_K = 269
const BASLANGIC_N = 35

async function aylikVerileriHesapla() {
  // Tüm kayıtları sayfalı olarak çek
  async function tumunuCek(tablo, kolonlar) {
    const SAYFA = 1000
    let tumVeriler = []
    let sayfa = 0
    while (true) {
      const { data, error } = await supabase
        .from(tablo)
        .select(kolonlar)
        .range(sayfa * SAYFA, (sayfa + 1) * SAYFA - 1)
      if (error || !data || data.length === 0) break
      tumVeriler = [...tumVeriler, ...data]
      if (data.length < SAYFA) break
      sayfa++
    }
    return tumVeriler
  }

  const [gelirler, giderler, nkler, { data: ayarlar }] = await Promise.all([
    tumunuCek('gelirler', 'donem, k, hesap'),
    tumunuCek('giderler', 'donem, k, hesap'),
    tumunuCek('nk_transferler', 'donem, k, n'),
    supabase.from('ayarlar').select('anahtar, deger'),
  ])

  const ayarMap = {}
  for (const a of ayarlar || []) ayarMap[a.anahtar] = a.deger
  const baslangicK = ayarMap['baslangic_banka'] ?? BASLANGIC_K
  const baslangicN = ayarMap['baslangic_nakit'] ?? BASLANGIC_N

  // Tüm dönemleri topla
  const donemler = new Set()
  for (const r of [...(gelirler || []), ...(giderler || []), ...(nkler || [])]) {
    if (r.donem) donemler.add(r.donem)
  }
  const sirali = [...donemler].filter(d => d >= BASLANGIC_DONEM).sort()

  // Dönem bazlı grupla
  const gelirMap = {}, giderMap = {}, nkMap = {}
  for (const r of gelirler || []) {
    if (!r.donem) continue
    if (!gelirMap[r.donem]) gelirMap[r.donem] = { K: 0, N: 0 }
    if (r.hesap === 'N') gelirMap[r.donem].N += r.k || 0
    else gelirMap[r.donem].K += r.k || 0
  }
  for (const r of giderler || []) {
    if (!r.donem) continue
    if (!giderMap[r.donem]) giderMap[r.donem] = { K: 0, N: 0 }
    if (r.hesap === 'N') giderMap[r.donem].N += r.k || 0
    else giderMap[r.donem].K += r.k || 0
  }
  for (const r of nkler || []) {
    if (!r.donem) continue
    if (!nkMap[r.donem]) nkMap[r.donem] = { K: 0, N: 0 }
    nkMap[r.donem].K += r.k || 0
    nkMap[r.donem].N += r.n || 0
  }

  // Kümülatif hesapla
  let cumK = baslangicK, cumN = baslangicN
  const satirlar = []

  // Başlangıç satırı
  satirlar.push({ donem: BASLANGIC_DONEM, gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, nkK: 0, nkN: 0, bakiyeK: cumK, bakiyeN: cumN, ilk: true })

  for (const d of sirali) {
    if (d === BASLANGIC_DONEM) continue
    const g = gelirMap[d] || { K: 0, N: 0 }
    const gi = giderMap[d] || { K: 0, N: 0 }
    const nk = nkMap[d] || { K: 0, N: 0 }

    cumK = cumK + g.K - gi.K + nk.K - nk.N
    cumN = cumN + g.N - gi.N - nk.K + nk.N

    satirlar.push({ donem: d, gelirK: g.K, gelirN: g.N, giderK: gi.K, giderN: gi.N, nkK: nk.K, nkN: nk.N, bakiyeK: cumK, bakiyeN: cumN })
  }

  return satirlar
}

export default function Hesap() {
  const { maskeli } = useMask()
  const gizle = (deger) => maskeli ? '••••' : (deger !== 0 ? formatPara(deger) : '—')
  const [satirlar, setSatirlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState('son6') // 'son6' | 'son12' | 'tamami'
  const mevcutDonem = buDonem()

  useEffect(() => {
    aylikVerileriHesapla().then(data => {
      setSatirlar(data)
      setYukleniyor(false)
    })
  }, [])

  const gosterilen = (() => {
    const liste = filtre === 'son6' ? satirlar.slice(-6)
                : filtre === 'son12' ? satirlar.slice(-12)
                : satirlar
    return [...liste].reverse()
  })()

  if (yukleniyor) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Aylık Hesap Özeti</h2>
        <div className="flex gap-2">
          {[['son6', 'Son 6 Ay'], ['son12', 'Son 12 Ay'], ['tamami', 'Tümü']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                filtre === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2.5 font-semibold text-slate-500 sticky left-0 bg-slate-50">Dönem</th>
              <th className="text-right px-3 py-2.5 font-semibold text-blue-700 bg-blue-50">Hesap (B)</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-700 bg-slate-100">Hesap (N)</th>
              <th className="text-right px-3 py-2.5 font-semibold text-green-600">Gelir B</th>
              <th className="text-right px-3 py-2.5 font-semibold text-green-400">Gelir N</th>
              <th className="text-right px-3 py-2.5 font-semibold text-red-500">Gider B</th>
              <th className="text-right px-3 py-2.5 font-semibold text-red-300">Gider N</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-400">N-B</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-400">B-N</th>
            </tr>
          </thead>
          <tbody>
            {gosterilen.map((r, i) => (
              <tr key={r.donem} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${r.ilk ? 'bg-yellow-50' : ''} ${r.donem === mevcutDonem ? 'bg-blue-50/40' : ''}`}>
                <td className={`px-3 py-2 sticky left-0 ${r.donem === mevcutDonem ? 'font-bold text-blue-700 bg-blue-50/40' : 'font-medium text-slate-700 bg-white'}`}>
                  {donemLabel(r.donem)}
                  {r.ilk && <span className="ml-1 text-yellow-600 text-[10px]">başlangıç</span>}
                  {r.donem === mevcutDonem && <span className="ml-1 text-blue-400 text-[10px]">●</span>}
                </td>
                <td className={`px-3 py-2 text-right bg-blue-50 ${r.bakiyeK >= 0 ? 'text-blue-700' : 'text-red-600'} ${r.donem === mevcutDonem ? 'font-extrabold' : 'font-bold'}`}>
                  {formatPara(r.bakiyeK)}
                </td>
                <td className={`px-3 py-2 text-right bg-slate-50 ${r.bakiyeN >= 0 ? 'text-slate-700' : 'text-red-600'} ${r.donem === mevcutDonem ? 'font-extrabold' : 'font-bold'}`}>
                  {formatPara(r.bakiyeN)}
                </td>
                <td className={`px-3 py-2 text-right text-green-600 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{gizle(r.gelirK)}</td>
                <td className={`px-3 py-2 text-right text-green-400 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{r.gelirN !== 0 ? formatPara(r.gelirN) : '—'}</td>
                <td className={`px-3 py-2 text-right text-red-500 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{r.giderK !== 0 ? formatPara(r.giderK) : '—'}</td>
                <td className={`px-3 py-2 text-right text-red-300 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{r.giderN !== 0 ? formatPara(r.giderN) : '—'}</td>
                <td className={`px-3 py-2 text-right text-slate-400 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{r.nkK !== 0 ? formatPara(r.nkK) : '—'}</td>
                <td className={`px-3 py-2 text-right text-slate-400 ${r.donem === mevcutDonem ? 'font-bold' : ''}`}>{r.nkN !== 0 ? formatPara(r.nkN) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        Toplam {satirlar.length} ay · Başlangıç: B=₺{formatPara(BASLANGIC_K)}, N=₺{formatPara(BASLANGIC_N)}
      </p>
    </div>
  )
}
