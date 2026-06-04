import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Trash2, Filter } from 'lucide-react'

// 12 hesap tanımı
export const HESAPLAR = [
  { tur: 'Birikim (TL)',               doviz: 'TL',  emoji: '💰', renk: 'bg-blue-50 border-blue-200 text-blue-800' },
  { tur: 'ALT(F)',                     doviz: 'ALT', emoji: '🥇', renk: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { tur: 'ALT(H)',                     doviz: 'ALT', emoji: '🏦', renk: 'bg-amber-50 border-amber-200 text-amber-800' },
  { tur: 'GMS(H)',                     doviz: 'GMS', emoji: '🪙', renk: 'bg-slate-50 border-slate-200 text-slate-700' },
  { tur: 'USD',                        doviz: 'USD', emoji: '💵', renk: 'bg-green-50 border-green-200 text-green-800' },
  { tur: 'EUR',                        doviz: 'EUR', emoji: '💶', renk: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { tur: 'GBP',                        doviz: 'GBP', emoji: '💷', renk: 'bg-purple-50 border-purple-200 text-purple-800' },
  { tur: 'Yatırım (İnşaat)',           doviz: 'TL',  emoji: '🏗️', renk: 'bg-orange-50 border-orange-200 text-orange-800' },
  { tur: 'Yatırım (Şirketi Hayriyye)', doviz: 'TL',  emoji: '🏢', renk: 'bg-rose-50 border-rose-200 text-rose-800' },
  { tur: 'Yatırım (Palandora)',        doviz: 'TL',  emoji: '🏪', renk: 'bg-pink-50 border-pink-200 text-pink-800' },
  { tur: 'Yatırım (Al-Sat)',           doviz: 'TL',  emoji: '🔄', renk: 'bg-teal-50 border-teal-200 text-teal-800' },
  { tur: 'Yatırım (Hayvancılık)',      doviz: 'TL',  emoji: '🐄', renk: 'bg-lime-50 border-lime-200 text-lime-800' },
]

const TL_OLMAYAN = HESAPLAR.filter(h => h.doviz !== 'TL' || h.tur === 'Birikim (TL)').filter(h => h.tur !== 'Birikim (TL)')

function IslemFormu({ onKapat, onKayit }) {
  const [seciliHesap, setSeciliHesap] = useState(HESAPLAR[0])
  const [islem, setIslem] = useState('giris') // 'giris' | 'cikis' | 'alis' | 'satis'
  const [miktar, setMiktar] = useState('')
  const [islemTl, setIslemTl] = useState('')
  const [kur, setKur] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const isTL = seciliHesap.doviz === 'TL'
  const isDoviz = !isTL

  const hesapDegistir = (h) => {
    setSeciliHesap(h)
    setIslem(h.doviz === 'TL' && h.tur !== 'Birikim (TL)' ? 'giris' : 'alis')
    setMiktar(''); setIslemTl(''); setKur('')
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)

    const m = parseFloat(miktar) || 0
    const tl = parseFloat(islemTl) || 0
    const k = parseFloat(kur) || null
    const tarihISO = new Date(tarih).toISOString()

    // Ana hesap kaydı
    let gercekMiktar = m
    let gercekTL = isTL ? m : tl
    if (islem === 'cikis' || islem === 'satis') {
      gercekMiktar = -m
      gercekTL = isTL ? -m : -tl
    }

    const kayitlar = [{
      tarih: tarihISO,
      tur: seciliHesap.tur,
      doviz_cinsi: seciliHesap.doviz,
      alt_tip: islem === 'alis' ? 'Alış' : islem === 'satis' ? 'Satış' : islem === 'giris' ? 'Giriş' : 'Çıkış',
      miktar: gercekMiktar,
      islem_tl: gercekTL,
      kur: k,
      aciklama: aciklama || null,
    }]

    // Birikim (TL) karşı kaydı (Birikim (TL) olmayan hesaplar için)
    if (seciliHesap.tur !== 'Birikim (TL)' && gercekTL !== 0) {
      const islemAdi = islem === 'alis' ? 'alımı' : islem === 'satis' ? 'satışı' : islem === 'giris' ? 'girişi' : 'çıkışı'
      const birim = isTL ? '₺' : seciliHesap.doviz
      kayitlar.push({
        tarih: tarihISO,
        tur: 'Birikim (TL)',
        doviz_cinsi: 'TL',
        miktar: gercekTL,
        islem_tl: gercekTL,
        aciklama: `${Math.abs(gercekMiktar)} ${birim} ${seciliHesap.tur} ${islemAdi}`,
      })
    }

    await supabase.from('birikim_hareketler').insert(kayitlar)
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">💰 Birikim İşlemi</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          {/* Hesap seçimi */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-2">Hesap</label>
            <div className="grid grid-cols-3 gap-1.5">
              {HESAPLAR.map(h => (
                <button key={h.tur} type="button" onClick={() => hesapDegistir(h)}
                  className={`px-2 py-1.5 rounded-xl text-xs border transition-colors text-left ${
                    seciliHesap.tur === h.tur ? h.renk : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {h.emoji} {h.tur.replace('Yatırım ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* İşlem tipi */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">İşlem</label>
            <div className="flex gap-2">
              {(seciliHesap.tur === 'Birikim (TL)'
                ? [['giris', '➕ Giriş'], ['cikis', '➖ Çıkış']]
                : isDoviz
                  ? [['alis', '📥 Alış'], ['satis', '📤 Satış']]
                  : [['giris', '➕ Giriş'], ['cikis', '➖ Çıkış']]
              ).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setIslem(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    islem === val
                      ? (val === 'alis' || val === 'giris') ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-600'
                      : 'border-slate-200 text-slate-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Miktar */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Miktar {isDoviz ? `(${seciliHesap.doviz})` : '(₺)'}
            </label>
            <input type="number" step="any" value={miktar} onChange={e => setMiktar(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          {/* TL karşılığı (sadece döviz hesaplar için) */}
          {isDoviz && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">TL Karşılığı (₺)</label>
              <input type="number" step="any" value={islemTl} onChange={e => setIslemTl(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
              {miktar && islemTl && (
                <p className="text-xs text-slate-400 mt-1">
                  Kur: {formatPara(Math.abs(parseFloat(islemTl)) / parseFloat(miktar))} ₺/{seciliHesap.doviz}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Özet */}
          {seciliHesap.tur !== 'Birikim (TL)' && (
            <div className={`rounded-xl p-3 text-xs ${(islem === 'alis' || islem === 'giris') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {isDoviz
                ? `${seciliHesap.tur} ${islem === 'alis' ? 'artar' : 'azalır'}, Birikim (TL) ${islem === 'alis' ? 'azalır' : 'artar'}.`
                : `${seciliHesap.tur} ${islem === 'giris' ? 'artar' : 'azalır'}, Birikim (TL) ${islem === 'giris' ? 'azalır' : 'artar'}.`
              }
            </div>
          )}

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
  const [filtreTur, setFiltreTur] = useState('Tümü')
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const SAYFA = 1000
    let tumVeriler = []
    let sayfa = 0
    while (true) {
      const { data, error } = await supabase
        .from('birikim_hareketler')
        .select('*')
        .order('tarih', { ascending: false })
        .range(sayfa * SAYFA, (sayfa + 1) * SAYFA - 1)
      if (error || !data || data.length === 0) break
      tumVeriler = [...tumVeriler, ...data]
      if (data.length < SAYFA) break
      sayfa++
    }
    setHareketler(tumVeriler)
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const sil = async (id) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('birikim_hareketler').delete().eq('id', id)
    yukle()
  }

  // Her hesabın bakiyesi
  const bakiyeler = {}
  for (const h of HESAPLAR) {
    bakiyeler[h.tur] = hareketler
      .filter(r => r.tur === h.tur)
      .reduce((s, r) => s + (r.miktar || 0), 0)
  }

  const filtrelenmis = filtreTur === 'Tümü' ? hareketler : hareketler.filter(r => r.tur === filtreTur)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Birikim & Yatırım</h2>
        <button onClick={() => setEkle(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> İşlem
        </button>
      </div>

      {/* 12 hesap özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {HESAPLAR.map(h => {
          const bakiye = bakiyeler[h.tur] || 0
          const birim = h.doviz
          return (
            <div key={h.tur}
              onClick={() => setFiltreTur(f => f === h.tur ? 'Tümü' : h.tur)}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${h.renk} ${filtreTur === h.tur ? 'ring-2 ring-blue-400' : ''}`}>
              <p className="text-xs font-semibold opacity-60 mb-1">{h.emoji} {h.tur}</p>
              <p className="text-lg font-bold">
                {birim === 'TL' ? `₺${formatPara(bakiye)}` : `${formatPara(bakiye)} ${birim}`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Filtre butonları */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setFiltreTur('Tümü')}
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 border ${
            filtreTur === 'Tümü' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
          }`}>Tümü</button>
        {HESAPLAR.map(h => (
          <button key={h.tur} onClick={() => setFiltreTur(f => f === h.tur ? 'Tümü' : h.tur)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 border transition-colors ${
              filtreTur === h.tur ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
            }`}>{h.emoji} {h.tur.replace('Yatırım ', '')}</button>
        ))}
      </div>

      {/* İşlem listesi */}
      {yukleniyor ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Kayıt yok. Import sayfasından Excel yükleyin veya İşlem ekleyin.
        </div>
      ) : (
        <div className="space-y-2">
          {(filtreTur === 'Tümü' ? filtrelenmis.slice(0, 200) : filtrelenmis).map(r => {
            const hesap = HESAPLAR.find(h => h.tur === r.tur)
            const birim = hesap?.doviz || 'TL'
            return (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.miktar >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-600">{r.tur}</span>
                    {r.alt_tip && <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{r.alt_tip}</span>}
                    {r.aciklama && <span className="text-xs text-slate-400 truncate">{r.aciklama}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(r.tarih).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${r.miktar >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {r.miktar >= 0 ? '+' : ''}{formatPara(r.miktar)} {birim !== 'TL' ? birim : '₺'}
                  </p>
                  {birim !== 'TL' && r.islem_tl !== 0 && (
                    <p className="text-xs text-slate-400">₺{formatPara(Math.abs(r.islem_tl))}</p>
                  )}
                </div>
                <button onClick={() => sil(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
          {filtreTur === 'Tümü' && filtrelenmis.length > 200 && (
            <p className="text-center text-xs text-slate-400 py-2">İlk 200 kayıt gösteriliyor. Hesap filtresi kullanın.</p>
          )}
        </div>
      )}

      {ekle && <IslemFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
