import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara } from '../db'
import { Plus, Trash2 } from 'lucide-react'

// Dövizli varlıklar: TL'den geçer, Al/Sat
const DOVIZ_VARLIKLAR = [
  { tur: 'Altın Fiziki', birim: 'gr', emoji: '🥇' },
  { tur: 'Altın Banka', birim: 'gr', emoji: '🏦' },
  { tur: 'GMS/Gümüş',   birim: 'gr', emoji: '🪙' },
  { tur: 'USD',          birim: '$',  emoji: '💵' },
  { tur: 'EUR',          birim: '€',  emoji: '💶' },
  { tur: 'GBP',          birim: '£',  emoji: '💷' },
]

// TL cinsinden varlıklar: giriş/çıkış TL
const TL_VARLIKLAR = [
  { tur: 'İnşaat',           emoji: '🏗️' },
  { tur: 'Büyükbaş Hayvan',  emoji: '🐄' },
  { tur: 'Borç Alacak',      emoji: '📋' },
]

const TUM_TURLER = [...DOVIZ_VARLIKLAR.map(v => v.tur), ...TL_VARLIKLAR.map(v => v.tur)]

function IslemFormu({ onKapat, onKayit }) {
  const [tur, setTur] = useState('Altın Fiziki')
  const [islem, setIslem] = useState('al')  // 'al' | 'sat' | 'giris' | 'cikis'
  const [miktar, setMiktar] = useState('')
  const [tlKarsiligi, setTlKarsiligi] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const isDoviz = DOVIZ_VARLIKLAR.some(v => v.tur === tur)
  const birim = DOVIZ_VARLIKLAR.find(v => v.tur === tur)?.birim || '₺'

  // İşlem tipini güncelle
  const turDegistir = (yeniTur) => {
    setTur(yeniTur)
    const yeniIsDoviz = DOVIZ_VARLIKLAR.some(v => v.tur === yeniTur)
    setIslem(yeniIsDoviz ? 'al' : 'giris')
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)

    const m = parseFloat(miktar) || 0
    const tl = parseFloat(tlKarsiligi) || 0
    const tarihObj = new Date(tarih)
    const donem = tarihObj.getFullYear() * 100 + tarihObj.getMonth() + 1

    if (isDoviz) {
      // Dövizli: varlık hareketi + TL karşı hareketi
      const varlıkMiktar = islem === 'al' ? m : -m
      const tlMiktar = islem === 'al' ? -tl : tl

      await Promise.all([
        // Varlık hareketi
        supabase.from('birikim_hareketler').insert({
          tarih, tur, alt_tip: islem === 'al' ? 'Alış' : 'Satış',
          miktar: varlıkMiktar, islem_tl: islem === 'al' ? -tl : tl,
          kur: m > 0 ? tl / m : null, aciklama: aciklama || null,
        }),
        // TL Birikim hareketi (karşı taraf)
        supabase.from('birikim_hareketler').insert({
          tarih, tur: 'TL', alt_tip: islem === 'al' ? `${tur} Alış` : `${tur} Satış`,
          miktar: tlMiktar, islem_tl: tlMiktar, kur: 1, aciklama: aciklama || null,
        }),
        // Gider kaydı (TL'den çıkış) - sadece alışta
        ...(islem === 'al' ? [supabase.from('giderler').insert({
          tarih, donem, kategori: `Birikim - ${tur}`, k: tl,
          hesap: 'K', aciklama: aciklama || null,
        })] : []),
        // Gelir kaydı (TL'ye giriş) - sadece satışta
        ...(islem === 'sat' ? [supabase.from('gelirler').insert({
          tarih, donem, tur: `Birikim - ${tur}`, k: tl,
          hesap: 'K', aciklama: aciklama || null,
        })] : []),
      ])
    } else {
      // TL cinsinden: sadece birikim hareketi
      const tlMiktar = islem === 'giris' ? m : -m
      await supabase.from('birikim_hareketler').insert({
        tarih, tur, alt_tip: islem === 'giris' ? 'Giriş' : 'Çıkış',
        miktar: tlMiktar, islem_tl: tlMiktar, kur: null,
        aciklama: aciklama || null,
      })
    }

    onKayit()
    onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">💰 Birikim İşlemi</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">

          {/* Varlık seçimi */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-2">Dövizli Varlıklar</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DOVIZ_VARLIKLAR.map(v => (
                <button key={v.tur} type="button" onClick={() => turDegistir(v.tur)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                    tur === v.tur ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-500'
                  }`}>
                  {v.emoji} {v.tur}
                </button>
              ))}
            </div>
            <label className="text-xs font-medium text-slate-500 block mb-2">TL Varlıklar</label>
            <div className="flex flex-wrap gap-2">
              {TL_VARLIKLAR.map(v => (
                <button key={v.tur} type="button" onClick={() => turDegistir(v.tur)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                    tur === v.tur ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-500'
                  }`}>
                  {v.emoji} {v.tur}
                </button>
              ))}
            </div>
          </div>

          {/* İşlem tipi */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">İşlem</label>
            <div className="flex gap-2">
              {isDoviz ? (
                <>
                  <button type="button" onClick={() => setIslem('al')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border ${islem === 'al' ? 'bg-green-50 border-green-400 text-green-700' : 'border-slate-200 text-slate-400'}`}>
                    📥 Al
                  </button>
                  <button type="button" onClick={() => setIslem('sat')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border ${islem === 'sat' ? 'bg-red-50 border-red-400 text-red-600' : 'border-slate-200 text-slate-400'}`}>
                    📤 Sat
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setIslem('giris')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border ${islem === 'giris' ? 'bg-green-50 border-green-400 text-green-700' : 'border-slate-200 text-slate-400'}`}>
                    ➕ Giriş
                  </button>
                  <button type="button" onClick={() => setIslem('cikis')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border ${islem === 'cikis' ? 'bg-red-50 border-red-400 text-red-600' : 'border-slate-200 text-slate-400'}`}>
                    ➖ Çıkış
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Miktar {isDoviz ? `(${birim})` : '(₺)'}
            </label>
            <input type="number" step="any" value={miktar} onChange={e => setMiktar(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          {isDoviz && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">TL Karşılığı (₺)</label>
              <input type="number" step="any" value={tlKarsiligi} onChange={e => setTlKarsiligi(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
              {miktar && tlKarsiligi && (
                <p className="text-xs text-slate-400 mt-1">
                  Kur: {formatPara(parseFloat(tlKarsiligi) / parseFloat(miktar))} ₺/{birim}
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

          {isDoviz && (
            <div className={`rounded-xl p-3 text-xs ${islem === 'al' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {islem === 'al'
                ? `TL bakiyeniz ₺${formatPara(parseFloat(tlKarsiligi) || 0)} azalacak, ${tur} bakiyeniz ${formatPara(parseFloat(miktar) || 0)} ${birim} artacak.`
                : `${tur} bakiyeniz ${formatPara(parseFloat(miktar) || 0)} ${birim} azalacak, TL bakiyeniz ₺${formatPara(parseFloat(tlKarsiligi) || 0)} artacak.`
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

  // Varlık özeti
  const ozet = hareketler.reduce((acc, r) => {
    acc[r.tur] = (acc[r.tur] || 0) + (r.miktar || 0)
    return acc
  }, {})

  const turler = ['Tümü', ...TUM_TURLER.filter(t => ozet[t] !== undefined)]
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

      {/* Özet kartlar */}
      {Object.keys(ozet).length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dövizli Varlıklar</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {DOVIZ_VARLIKLAR.filter(v => ozet[v.tur] !== undefined && ozet[v.tur] !== 0).map(v => (
              <div key={v.tur} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500">{v.emoji} {v.tur}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{formatPara(ozet[v.tur])} {v.birim}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">TL Varlıklar</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {TL_VARLIKLAR.filter(v => ozet[v.tur] !== undefined && ozet[v.tur] !== 0).map(v => (
              <div key={v.tur} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500">{v.emoji} {v.tur}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₺{formatPara(ozet[v.tur])}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {turler.map(t => (
          <button key={t} onClick={() => setFiltreTur(t)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 border transition-colors ${
              filtreTur === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* İşlem listesi */}
      {yukleniyor ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Kayıt yok. İşlem butonundan ekleyin veya Import sayfasından Excel yükleyin.
        </div>
      ) : (
        <div className="space-y-2">
          {filtrelenmis.map(r => {
            const doviz = DOVIZ_VARLIKLAR.find(v => v.tur === r.tur)
            return (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r.miktar >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{r.tur}</span>
                    {r.alt_tip && <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{r.alt_tip}</span>}
                    {r.aciklama && <span className="text-xs text-slate-400 truncate">{r.aciklama}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(r.tarih).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${r.miktar >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {r.miktar >= 0 ? '+' : ''}{formatPara(r.miktar)} {doviz?.birim || '₺'}
                  </p>
                  {doviz && r.islem_tl !== 0 && (
                    <p className="text-xs text-slate-400">₺{formatPara(Math.abs(r.islem_tl))}</p>
                  )}
                </div>
                <button onClick={() => sil(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {ekle && <EkleFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
    </div>
  )
}
