import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, yerelTarih, donemLabel, efektifDonem, tarihtenDonem, ARAC_KATEGORILER } from '../db'
import TarihInput from '../components/TarihInput'
import { aracCacheTemizle } from '../components/AracSecici'
import { Plus, Pencil } from 'lucide-react'

const SIMGELER = [['🚗', 'Araba'], ['🏍️', 'Motosiklet']]
const VARSAYILAN_EMOJI = SIMGELER[0][0]

// Supabase varsayılan olarak 1000 satır döner ve fazlasını sessizce keser —
// araç giderleri yıllar içinde bu sınırı aşabilir, sayfalı çekilir.
async function tumunuCek(tablo, kolonlar, filtreFn) {
  const SAYFA = 1000
  let tumVeriler = []
  let sayfa = 0
  while (true) {
    let q = supabase.from(tablo).select(kolonlar)
    if (filtreFn) q = filtreFn(q)
    const { data, error } = await q.range(sayfa * SAYFA, (sayfa + 1) * SAYFA - 1)
    if (error || !data || data.length === 0) break
    tumVeriler = [...tumVeriler, ...data]
    if (data.length < SAYFA) break
    sayfa++
  }
  return tumVeriler
}

// İki dönem (YYYYMM) arasındaki ay sayısı — ikisi de dahil.
function ayFarki(bas, son) {
  if (!bas || !son || son < bas) return 0
  const y1 = Math.floor(bas / 100), a1 = bas % 100
  const y2 = Math.floor(son / 100), a2 = son % 100
  return (y2 - y1) * 12 + (a2 - a1) + 1
}

function AracFormu({ arac, onKapat, onKayit }) {
  const [form, setForm] = useState({
    ad: arac?.ad || '',
    plaka: arac?.plaka || '',
    emoji: arac?.emoji || VARSAYILAN_EMOJI,
    alis_tarihi: arac?.alis_tarihi ? yerelTarih(arac.alis_tarihi) : yerelTarih(new Date()),
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const degerler = {
      ad: form.ad.trim(),
      plaka: form.plaka.trim() || null,
      emoji: form.emoji.trim() || null,
      alis_tarihi: form.alis_tarihi || null,
    }
    if (arac) {
      await supabase.from('araclar').update(degerler).eq('id', arac.id)
    } else {
      await supabase.from('araclar').insert(degerler)
    }
    aracCacheTemizle()
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center px-4 pt-4 pb-20 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{arac ? '✏️ Aracı Düzenle' : '🚗 Araç Ekle'}</h3>
          {!arac && <p className="text-xs text-slate-400 mt-0.5">Yeni araç alındığında eklenir</p>}
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tür</label>
            <div className="flex gap-2">
              {SIMGELER.map(([simge, ad]) => (
                <button key={simge} type="button" onClick={() => setForm(f => ({ ...f, emoji: simge }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.emoji === simge ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{simge} {ad}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Araç Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              placeholder="Örn. Megane"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Plaka</label>
            <input type="text" value={form.plaka} onChange={e => setForm(f => ({ ...f, plaka: e.target.value }))}
              placeholder="İsteğe bağlı..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Alış Tarihi</label>
            <TarihInput value={form.alis_tarihi} onChange={v => setForm(f => ({ ...f, alis_tarihi: v }))}
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

function SatisFormu({ arac, onKapat, onKayit }) {
  const [tarih, setTarih] = useState(yerelTarih(new Date()))
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('araclar')
      .update({ aktif: false, satis_tarihi: tarih || null }).eq('id', arac.id)
    aracCacheTemizle()
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center px-4 pt-4 pb-20 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">🏷️ Satıldı — {arac.ad}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Araç pasife çekilir, geçmiş giderleri durur</p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Satış Tarihi</label>
            <TarihInput value={tarih} onChange={setTarih}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Satıldı İşaretle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Arac() {
  const [araclar, setAraclar] = useState([])
  const [hareketler, setHareketler] = useState([])
  const [secili, setSecili] = useState(null)   // arac_id
  const [form, setForm] = useState(null)       // null | 'ekle' | 'duzenle' | 'satis'
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: araclarData }, giderler] = await Promise.all([
      supabase.from('araclar').select('*').order('sira', { nullsFirst: false }).order('id'),
      // Araç giderleri hep hesap_hareketler'de biter: doğrudan girilen giderler
      // ile ekstresi ödenmiş KK harcamaları aynı tabloda buluşur.
      tumunuCek('hesap_hareketler', 'id, arac_id, donem, tarih, tutar, kategori, aciklama',
        q => q.not('arac_id', 'is', null)),
    ])
    const liste = araclarData || []
    setAraclar(liste)
    setHareketler(giderler)
    setSecili(s => (s && liste.some(a => a.id === s)) ? s : (liste.find(a => a.aktif)?.id ?? liste[0]?.id ?? null))
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const geriAl = async (arac) => {
    if (!confirm(`"${arac.ad}" tekrar aktif hale getirilsin mi?`)) return
    await supabase.from('araclar').update({ aktif: true, satis_tarihi: null }).eq('id', arac.id)
    aracCacheTemizle()
    yukle()
  }

  const seciliArac = araclar.find(a => a.id === secili) || null
  const aracHareketler = hareketler.filter(r => r.arac_id === secili)

  // Dönem → { Akaryakıt, Ulaşım, toplam }. Gider tutarları hesap_hareketler'de
  // negatif tutulur, burada pozitif harcamaya çevrilir.
  const aylik = (() => {
    const map = {}
    for (const r of aracHareketler) {
      const d = r.donem || tarihtenDonem(r.tarih)
      if (!d) continue
      if (!map[d]) map[d] = { donem: d, toplam: 0, ...Object.fromEntries(ARAC_KATEGORILER.map(k => [k, 0])) }
      const tutar = Math.abs(r.tutar || 0)
      map[d].toplam += tutar
      if (ARAC_KATEGORILER.includes(r.kategori)) map[d][r.kategori] += tutar
    }
    return Object.values(map).sort((a, b) => b.donem - a.donem)
  })()

  const toplam = aylik.reduce((s, r) => s + r.toplam, 0)

  // Ortalama, kayıtsız ayları da sayan gerçek sahiplik süresine bölünür:
  // alıştan (yoksa ilk giderden) satışa (satılmamışsa bu döneme) kadar.
  const ilkDonem = seciliArac?.alis_tarihi
    ? tarihtenDonem(seciliArac.alis_tarihi)
    : (aylik.length > 0 ? aylik[aylik.length - 1].donem : null)
  const sonDonem = seciliArac?.satis_tarihi ? tarihtenDonem(seciliArac.satis_tarihi) : efektifDonem()
  const aySayisi = ayFarki(ilkDonem, sonDonem)
  const ortalama = aySayisi > 0 ? toplam / aySayisi : 0
  const sonAy = aylik.length > 0 ? aylik[0] : null

  const enBuyukAy = aylik.reduce((m, r) => Math.max(m, r.toplam), 0)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Araçlar</h2>
        <button onClick={() => setForm('ekle')}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
          <Plus size={15} /> Araç Ekle
        </button>
      </div>

      {yukleniyor ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : araclar.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm space-y-1">
          <p className="text-2xl">🚗</p>
          <p>Henüz araç yok.</p>
          <p>Yeni araç alınca "Araç Ekle" ile başlayın.</p>
        </div>
      ) : (
        <>
          {/* Araç kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            {araclar.map(a => {
              const isSecili = a.id === secili
              const aToplam = hareketler.filter(r => r.arac_id === a.id).reduce((s, r) => s + Math.abs(r.tutar || 0), 0)
              return (
                <button key={a.id} onClick={() => setSecili(a.id)}
                  className={`rounded-2xl p-3 text-left w-full transition-all border-2 shadow-sm ${
                    isSecili
                      ? (a.aktif ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-600 border-slate-600 text-white')
                      : (a.aktif ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500')
                  }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm leading-none">{a.emoji || VARSAYILAN_EMOJI}</span>
                    <span className="text-xs font-semibold truncate">{a.ad}</span>
                  </div>
                  <p className="text-base font-bold leading-tight">₺{formatPara(aToplam)}</p>
                  <p className={`text-xs mt-0.5 ${isSecili ? 'opacity-75' : 'opacity-60'}`}>
                    {a.aktif ? (a.plaka || 'Toplam gider') : 'Satıldı'}
                  </p>
                </button>
              )
            })}
          </div>

          {seciliArac && (
            <>
              {/* Seçili araç başlığı + aksiyonlar */}
              <div className={`rounded-2xl p-4 mb-4 border ${seciliArac.aktif ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {seciliArac.emoji || VARSAYILAN_EMOJI} {seciliArac.ad}
                      {seciliArac.plaka && <span className="ml-1.5 text-xs text-slate-400">{seciliArac.plaka}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {seciliArac.alis_tarihi ? `Alış: ${formatTarih(seciliArac.alis_tarihi)}` : 'Alış tarihi yok'}
                      {seciliArac.satis_tarihi && ` · Satış: ${formatTarih(seciliArac.satis_tarihi)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setForm('duzenle')} title="Aracı düzenle"
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors">
                      <Pencil size={14} />
                    </button>
                    {seciliArac.aktif ? (
                      <button onClick={() => setForm('satis')}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
                        Satıldı
                      </button>
                    ) : (
                      <button onClick={() => geriAl(seciliArac)}
                        className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                        Geri Al
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Aylık Ortalama</p>
                    <p className="text-base font-bold text-blue-700">₺{formatPara(ortalama)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{aySayisi} ay</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Son Ay</p>
                    <p className="text-base font-bold text-slate-700">₺{formatPara(sonAy?.toplam || 0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sonAy ? donemLabel(sonAy.donem) : '—'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Toplam</p>
                    <p className="text-base font-bold text-red-600">₺{formatPara(toplam)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{aracHareketler.length} kayıt</p>
                  </div>
                </div>
              </div>

              {/* Aylık gider tablosu */}
              {aylik.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm space-y-1">
                  <p className="text-2xl">⛽</p>
                  <p>Bu araca bağlı gider yok.</p>
                  <p className="text-xs">Gider eklerken kategori {ARAC_KATEGORILER.join(' / ')} seçince araç seçebilirsiniz.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <th className="text-left px-3 py-2.5 font-semibold w-20">Dönem</th>
                        {ARAC_KATEGORILER.map(k => (
                          <th key={k} className="text-right px-3 py-2.5 font-semibold">{k}</th>
                        ))}
                        <th className="text-right px-3 py-2.5 font-semibold w-24">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aylik.map(r => (
                        <tr key={r.donem} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500 border-l-2 border-blue-300 whitespace-nowrap">
                            {donemLabel(r.donem)}
                          </td>
                          {ARAC_KATEGORILER.map(k => (
                            <td key={k} className="px-3 py-2 text-right text-slate-500">
                              {r[k] > 0 ? `₺${formatPara(r[k])}` : <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-bold text-slate-700">
                            <div className="flex items-center justify-end gap-2">
                              <span className="hidden sm:block h-1.5 bg-blue-200 rounded-full"
                                style={{ width: `${enBuyukAy > 0 ? Math.round((r.toplam / enBuyukAy) * 40) : 0}px` }} />
                              ₺{formatPara(r.toplam)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-400">{aylik.length} ay</td>
                        {ARAC_KATEGORILER.map(k => (
                          <td key={k} className="px-3 py-2 text-right text-slate-500 font-semibold">
                            ₺{formatPara(aylik.reduce((s, r) => s + r[k], 0))}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold text-red-500">₺{formatPara(toplam)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {form === 'ekle' && <AracFormu onKapat={() => setForm(null)} onKayit={yukle} />}
      {form === 'duzenle' && seciliArac && (
        <AracFormu arac={seciliArac} onKapat={() => setForm(null)} onKayit={yukle} />
      )}
      {form === 'satis' && seciliArac && (
        <SatisFormu arac={seciliArac} onKapat={() => setForm(null)} onKayit={yukle} />
      )}
    </div>
  )
}
