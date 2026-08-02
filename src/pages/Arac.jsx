import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, yerelTarih, donemLabel, efektifDonem, tarihtenDonem, ARAC_KATEGORILER, yakitTuketimi } from '../db'
import TarihInput from '../components/TarihInput'
import { aracCacheTemizle } from '../components/AracSecici'
import { Plus, Pencil, Link2 } from 'lucide-react'

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

// Geçmişte araçtan bağımsız girilmiş araç-kategorili (ARAC_KATEGORILER) giderleri
// toplu olarak bir araca dağıtmak için. Yalnızca hesap_hareketler üzerinde çalışır — Araç
// sayfası da oradan okuduğu için atama anında rapora yansır. Henüz ekstresi
// ödenmemiş KK harcamaları burada görünmez; onların bağı Borç/Alacak sayfasındaki
// harcama formundan kurulur ve ödeme anında buraya taşınır.
function GecmisAtamaFormu({ arac, araclar, onKapat, onKayit }) {
  const GOSTERIM_SINIRI = 500

  const [kayitlar, setKayitlar] = useState([])
  const [secili, setSecili] = useState(() => new Set())
  const [kategoriFiltre, setKategoriFiltre] = useState('')
  const [sadeceBos, setSadeceBos] = useState(true)
  const [basDonem, setBasDonem] = useState('')
  const [sonDonem, setSonDonem] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    tumunuCek('hesap_hareketler', 'id, tarih, donem, tutar, kategori, aciklama, arac_id',
      q => q.in('kategori', ARAC_KATEGORILER).lt('tutar', 0))
      .then(rows => {
        setKayitlar(rows.sort((a, b) => (b.donem || 0) - (a.donem || 0) || new Date(b.tarih) - new Date(a.tarih)))
        setYukleniyor(false)
      })
  }, [])

  const donemler = [...new Set(kayitlar.map(r => r.donem).filter(Boolean))].sort((a, b) => b - a)

  const gosterilecek = kayitlar.filter(r => {
    if (sadeceBos && r.arac_id) return false
    if (kategoriFiltre && r.kategori !== kategoriFiltre) return false
    if (basDonem && (r.donem || 0) < parseInt(basDonem)) return false
    if (sonDonem && (r.donem || 0) > parseInt(sonDonem)) return false
    return true
  })

  const seciliKayitlar = kayitlar.filter(r => secili.has(r.id))
  const seciliToplam = seciliKayitlar.reduce((s, r) => s + Math.abs(r.tutar || 0), 0)
  const gorunenSecili = gosterilecek.filter(r => secili.has(r.id)).length
  const hepsiSecili = gosterilecek.length > 0 && gorunenSecili === gosterilecek.length

  const degistir = (id) => setSecili(s => {
    const y = new Set(s)
    if (y.has(id)) y.delete(id); else y.add(id)
    return y
  })

  // Seçim yardımcıları filtrelenmiş listenin TAMAMINA uygulanır — ekranda
  // yalnızca ilk GOSTERIM_SINIRI satır çizilse bile.
  const tumunuDegistir = () => setSecili(s => {
    const y = new Set(s)
    if (hepsiSecili) gosterilecek.forEach(r => y.delete(r.id))
    else gosterilecek.forEach(r => y.add(r.id))
    return y
  })

  // Aracın alış–satış aralığına düşen kayıtları seçer: geçmişi iki araç arasında
  // bölmenin en hızlı yolu.
  const sahiplikSec = () => {
    const bas = arac.alis_tarihi ? tarihtenDonem(arac.alis_tarihi) : null
    const son = arac.satis_tarihi ? tarihtenDonem(arac.satis_tarihi) : null
    setSecili(s => {
      const y = new Set(s)
      gosterilecek.forEach(r => {
        if (bas && (r.donem || 0) < bas) return
        if (son && (r.donem || 0) > son) return
        y.add(r.id)
      })
      return y
    })
  }

  const uygula = async (hedefAracId) => {
    const ids = [...secili]
    if (ids.length === 0) return
    const soru = hedefAracId
      ? `${ids.length} kayıt "${arac.ad}" aracına atansın mı?`
      : `${ids.length} kaydın araç bağı kaldırılsın mı?`
    if (!confirm(soru)) return
    setKaydediliyor(true)
    // .in() filtresi sorgu string'ine gömülür — uzun URL'den kaçınmak için parçalanır
    const PARCA = 100
    for (let i = 0; i < ids.length; i += PARCA) {
      await supabase.from('hesap_hareketler')
        .update({ arac_id: hedefAracId }).in('id', ids.slice(i, i + PARCA))
    }
    onKayit(); onKapat()
  }

  const aracAdi = (id) => {
    const a = araclar.find(x => x.id === id)
    return a ? `${a.emoji || VARSAYILAN_EMOJI} ${a.ad}` : ''
  }

  const filtreCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center px-4 pt-4 pb-20 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">🔗 Geçmiş Giderleri Ata — {arac.ad}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Araçtan bağımsız girilmiş {ARAC_KATEGORILER.join(' / ')} giderleri
          </p>
        </div>

        {/* Filtreler */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <select value={kategoriFiltre} onChange={e => setKategoriFiltre(e.target.value)} className={`flex-1 ${filtreCls}`}>
              <option value="">Tüm kategoriler</option>
              {ARAC_KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={basDonem} onChange={e => setBasDonem(e.target.value)} className={`flex-1 ${filtreCls}`}>
              <option value="">En eski</option>
              {donemler.map(d => <option key={d} value={d}>{donemLabel(d)}</option>)}
            </select>
            <select value={sonDonem} onChange={e => setSonDonem(e.target.value)} className={`flex-1 ${filtreCls}`}>
              <option value="">En yeni</option>
              {donemler.map(d => <option key={d} value={d}>{donemLabel(d)}</option>)}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setSadeceBos(b => !b)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                sadeceBos ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-400'
              }`}>
              {sadeceBos ? 'Sadece atanmamışlar' : 'Atanmışlar dahil'}
            </button>
            <button type="button" onClick={tumunuDegistir} disabled={gosterilecek.length === 0}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              {hepsiSecili ? 'Seçimi kaldır' : `Görünen ${gosterilecek.length} kaydı seç`}
            </button>
            {(arac.alis_tarihi || arac.satis_tarihi) && (
              <button type="button" onClick={sahiplikSec}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Aracın alış–satış tarihleri arasındaki kayıtları seçer">
                Sahiplik dönemini seç
              </button>
            )}
            {secili.size > 0 && (
              <button type="button" onClick={() => setSecili(new Set())}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-400 hover:bg-slate-50">
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {yukleniyor ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : gosterilecek.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">
              {sadeceBos ? 'Atanmamış gider kalmadı.' : 'Bu filtrede kayıt yok.'}
            </p>
          ) : (
            <>
              {gosterilecek.slice(0, GOSTERIM_SINIRI).map(r => {
                const isSecili = secili.has(r.id)
                return (
                  <button key={r.id} type="button" onClick={() => degistir(r.id)}
                    className={`w-full grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 px-4 py-2 text-left border-b border-slate-50 last:border-0 transition-colors ${
                      isSecili ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}>
                    <span className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                      isSecili ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'
                    }`}>
                      {isSecili && <span className="text-[10px] leading-none">✓</span>}
                    </span>
                    <span className="text-xs text-slate-400 w-[68px] flex-shrink-0">{formatTarih(r.tarih)}</span>
                    <span className="min-w-0 flex items-center gap-1.5 overflow-hidden">
                      <span className="text-xs text-slate-600 flex-shrink-0">{r.kategori}</span>
                      {r.aciklama && <span className="text-xs text-slate-400 min-w-0 truncate">{r.aciklama}</span>}
                      {r.arac_id && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                          {aracAdi(r.arac_id)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-red-500 whitespace-nowrap">₺{formatPara(Math.abs(r.tutar || 0))}</span>
                  </button>
                )
              })}
              {gosterilecek.length > GOSTERIM_SINIRI && (
                <p className="text-center text-xs text-slate-400 py-3 px-4">
                  {gosterilecek.length} kaydın ilk {GOSTERIM_SINIRI}'ü çiziliyor — seçim butonları
                  yine de {gosterilecek.length} kaydın tamamına uygulanır.
                </p>
              )}
            </>
          )}
        </div>

        {/* Alt bar */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0 space-y-2">
          <div className="flex justify-between text-xs px-0.5">
            <span className="text-slate-500">{secili.size} kayıt seçili</span>
            <span className="font-semibold text-slate-700">₺{formatPara(seciliToplam)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onKapat}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Kapat</button>
            {!sadeceBos && (
              <button type="button" onClick={() => uygula(null)} disabled={kaydediliyor || secili.size === 0}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 disabled:opacity-40">
                Bağı Kaldır
              </button>
            )}
            <button type="button" onClick={() => uygula(arac.id)} disabled={kaydediliyor || secili.size === 0}
              className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40">
              {kaydediliyor ? 'Atanıyor...' : `${arac.emoji || VARSAYILAN_EMOJI} ${arac.ad} aracına ata`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Arac() {
  const [araclar, setAraclar] = useState([])
  const [hareketler, setHareketler] = useState([])
  const [secili, setSecili] = useState(null)   // arac_id
  const [form, setForm] = useState(null)       // null | 'ekle' | 'duzenle' | 'satis' | 'gecmis'
  const [sekme, setSekme] = useState('gider')  // 'gider' | 'yakit'
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: araclarData }, giderler] = await Promise.all([
      supabase.from('araclar').select('*').order('sira', { nullsFirst: false }).order('id'),
      // Araç giderleri hep hesap_hareketler'de biter: doğrudan girilen giderler
      // ile ekstresi ödenmiş KK harcamaları aynı tabloda buluşur.
      tumunuCek('hesap_hareketler', 'id, arac_id, donem, tarih, tutar, kategori, aciklama, km, litre, tam_depo',
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

  // Dönem → kategori başına toplam + genel toplam (sütunlar ARAC_KATEGORILER'den
  // türer). Gider tutarları hesap_hareketler'de negatif tutulur, burada pozitife çevrilir.
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

  // Kategori sayısı arttıkça tablo dar ekranda taşıyor — bu araçta hiç kaydı
  // olmayan kategoriler sütun açmaz.
  const dolu = ARAC_KATEGORILER.filter(k => aylik.some(r => r[k] > 0))
  const sutunlar = dolu.length > 0 ? dolu : ARAC_KATEGORILER

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

  // Yakıt: km/litre girilmiş dolumlar. Tutar da taşındığı için ₺/lt ve ₺/km
  // buradan çıkar; `araliklar` iki tam depo arasındaki ölçümleri verir.
  const yakit = yakitTuketimi(aracHareketler)
  const dolumToplamTutar = yakit.dolumlar.reduce((s, d) => s + Math.abs(d.tutar || 0), 0)
  const dolumToplamLitre = yakit.dolumlar.reduce((s, d) => s + (d.litre || 0), 0)
  const litreFiyat = dolumToplamLitre > 0 ? dolumToplamTutar / dolumToplamLitre : 0
  const kmMaliyet = yakit.toplamMesafe > 0 ? (yakit.ortalama / 100) * litreFiyat : 0

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

                <button onClick={() => setForm('gecmis')}
                  className="mt-2 w-full py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5">
                  <Link2 size={13} /> Geçmiş Giderleri Ata
                </button>
              </div>

              {/* Sekmeler */}
              <div className="flex gap-2 mb-3">
                {[['gider', '📊 Aylık Gider'], ['yakit', `⛽ Yakıt${yakit.dolumlar.length > 0 ? ` (${yakit.dolumlar.length})` : ''}`]].map(([val, label]) => (
                  <button key={val} onClick={() => setSekme(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      sekme === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
                    }`}>{label}</button>
                ))}
              </div>

              {/* Aylık gider tablosu */}
              {sekme === 'gider' && (aylik.length === 0 ? (
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
                        {sutunlar.map(k => (
                          <th key={k} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{k}</th>
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
                          {sutunlar.map(k => (
                            <td key={k} className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
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
                        {sutunlar.map(k => (
                          <td key={k} className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">
                            ₺{formatPara(aylik.reduce((s, r) => s + r[k], 0))}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold text-red-500">₺{formatPara(toplam)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              {/* Yakıt tüketimi */}
              {sekme === 'yakit' && (yakit.dolumlar.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm space-y-1">
                  <p className="text-2xl">⛽</p>
                  <p>Bu araca ait dolum kaydı yok.</p>
                  <p className="text-xs">Akaryakıt gideri eklerken araç seçtikten sonra km ve litre alanları çıkar.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-xs text-slate-400 mb-1">Ortalama Tüketim</p>
                      <p className="text-base font-bold text-blue-700">
                        {yakit.ortalama > 0 ? `${yakit.ortalama.toFixed(2)} L` : '—'}
                        {yakit.ortalama > 0 && <span className="text-xs font-normal text-slate-400"> /100km</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{yakit.araliklar.length} ölçüm</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Ölçülen Mesafe</p>
                      <p className="text-base font-bold text-slate-700">{yakit.toplamMesafe.toLocaleString('tr')} km</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatPara(yakit.olculenLitre)} L</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Ort. Litre Fiyatı</p>
                      <p className="text-base font-bold text-slate-700">₺{formatPara(litreFiyat)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatPara(dolumToplamLitre)} L toplam</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Km Maliyeti</p>
                      <p className="text-base font-bold text-red-600">
                        {kmMaliyet > 0 ? `₺${formatPara(kmMaliyet)}` : '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">yakıt / km</p>
                    </div>
                  </div>

                  {yakit.araliklar.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                      Tüketim ölçümü için en az iki tam depo dolumu gerekiyor — ilk dolumun litresi
                      ölçülmüş bir mesafeye karşılık gelmediği için ortalamaya girmez.
                    </p>
                  )}

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                          <th className="text-left px-3 py-2.5 font-semibold w-[84px]">Tarih</th>
                          <th className="text-right px-2 py-2.5 font-semibold">Km</th>
                          <th className="text-right px-2 py-2.5 font-semibold">Litre</th>
                          <th className="text-right px-2 py-2.5 font-semibold">Tutar</th>
                          <th className="text-right px-3 py-2.5 font-semibold w-20">Tüketim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...yakit.dolumlar].reverse().map(d => {
                          // Bu dolumda kapanan ölçüm aralığı (varsa) satırın tüketimidir
                          const aralik = yakit.araliklar.find(a => a.son.id === d.id)
                          const eksik = d.tam_depo === false
                          return (
                            <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                              <td className={`pl-3 pr-2 py-2 whitespace-nowrap border-l-2 text-slate-400 ${eksik ? 'border-amber-300' : 'border-blue-300'}`}>
                                {formatTarih(d.tarih)}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-500">{d.km?.toLocaleString('tr')}</td>
                              <td className="px-2 py-2 text-right text-slate-500">
                                {formatPara(d.litre)}
                                {eksik && <span className="ml-1 text-[10px] text-amber-600">eksik</span>}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-500">₺{formatPara(Math.abs(d.tutar || 0))}</td>
                              <td className="px-3 py-2 text-right font-bold text-blue-700 whitespace-nowrap">
                                {aralik
                                  ? <>{aralik.tuketim.toFixed(2)}<span className="text-slate-400 font-normal text-[10px] ml-0.5">L</span></>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td className="px-3 py-2 text-slate-400">{yakit.dolumlar.length} dolum</td>
                          <td className="px-2 py-2 text-right text-slate-500 font-semibold">{yakit.toplamMesafe.toLocaleString('tr')}</td>
                          <td className="px-2 py-2 text-right text-slate-500 font-semibold">{formatPara(dolumToplamLitre)}</td>
                          <td className="px-2 py-2 text-right text-slate-500 font-semibold">₺{formatPara(dolumToplamTutar)}</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-700">
                            {yakit.ortalama > 0 ? yakit.ortalama.toFixed(2) : '—'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 px-0.5">
                    Tüketim iki tam depo arasında ölçülür; eksik dolumların litresi bir sonraki
                    tam depoya eklenir. Satırdaki değer o dolumda kapanan aralığın L/100km'sidir.
                  </p>
                </>
              ))}
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
      {form === 'gecmis' && seciliArac && (
        <GecmisAtamaFormu arac={seciliArac} araclar={araclar} onKapat={() => setForm(null)} onKayit={yukle} />
      )}
    </div>
  )
}
