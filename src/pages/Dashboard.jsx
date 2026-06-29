import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatPara, yerelTarih } from '../db'
import { Landmark, Banknote, ArrowLeftRight, Settings, CreditCard, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import CoinIcon from '../components/CoinIcon'
import TarihInput from '../components/TarihInput'

// Görsel meta verisi yoksa kullanılacak varsayılanlar (Birikim.jsx ile aynı)
const VARSAYILAN_EMOJI = '💼'
const VARSAYILAN_RENK = 'bg-slate-50 border-slate-200 text-slate-700'

// Ücretsiz, anahtarsız kur/altın API'si — TL bazlı satış fiyatları döner.
// Sayılar Türkçe formatta gelir ("6.045,87" gibi); binlik nokta silinip ondalık
// virgül noktaya çevrilerek parse edilir.
function trSayiParse(s) {
  if (!s) return null
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function disApidenKurCek() {
  const res = await fetch('https://finans.truncgil.com/today.json')
  const data = await res.json()
  return {
    USD: trSayiParse(data.USD?.Satış),
    EUR: trSayiParse(data.EUR?.Satış),
    GBP: trSayiParse(data.GBP?.Satış),
    ALT: trSayiParse(data['gram-altin']?.Satış),
    GMS: trSayiParse(data.gumus?.Satış),
  }
}

// Bugünün kuru kur_gecmisi'nde varsa onu kullanır (dış API'ye gitmez).
// Yoksa veya zorla=true ise dış API'den çekip o günün satırını upsert eder.
async function kurlariGetir(zorla = false) {
  const bugun = yerelTarih(new Date())
  if (!zorla) {
    const { data } = await supabase.from('kur_gecmisi').select('*').eq('tarih', bugun).maybeSingle()
    if (data) return { USD: data.usd, EUR: data.eur, GBP: data.gbp, ALT: data.alt, GMS: data.gms }
  }
  try {
    const kurlar = await disApidenKurCek()
    await supabase.from('kur_gecmisi').upsert({
      tarih: bugun, usd: kurlar.USD, eur: kurlar.EUR, gbp: kurlar.GBP, alt: kurlar.ALT, gms: kurlar.GMS,
      guncellenme: new Date().toISOString(),
    }, { onConflict: 'tarih' })
    return kurlar
  } catch {
    return null
  }
}

// Kişi/Banka/Nakit/Birikim hareketlerinde "hesap başına en yüksek sira" deseni
// (Islemler.jsx / Birikim.jsx / BorcAlacak.jsx ile aynı)
async function hesapHareketSiraGetir(hesapId) {
  const { data } = await supabase.from('hesap_hareketler')
    .select('sira').eq('hesap_id', hesapId)
    .order('sira', { ascending: false }).limit(1)
  return (data?.[0]?.sira ?? -1) + 1
}

function TransferFormu({ hesapIds, onKapat, onKayit }) {
  const [yon, setYon] = useState('cek')
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(yerelTarih(new Date()))
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const t = parseFloat(tutar) || 0
    const d = new Date(tarih)
    const donem = d.getFullYear() * 100 + d.getMonth() + 1
    // Yeni mimaride gerçek Banka↔Nakit iç transferleri, Birikim/İşlemler'deki
    // gibi grup_id ile eşli simetrik bir çift olarak hesap_hareketler'e yazılır
    // (bkz. Hesap.jsx'in bu çiftleri nasıl okuyup transferNet'e topladığı).
    //   'yukle' = nakitten bankaya yükleme → banka artar (+), nakit azalır (-)
    //   'cek'   = bankadan nakit çekme    → banka azalır (-), nakit artar (+)
    const grupId = crypto.randomUUID()
    const bankaTutar = yon === 'yukle' ? t : -t
    const nakitTutar = -bankaTutar
    const [siraBanka, siraNakit] = await Promise.all([
      hesapHareketSiraGetir(hesapIds.banka),
      hesapHareketSiraGetir(hesapIds.nakit),
    ])
    await supabase.from('hesap_hareketler').insert([
      {
        hesap_id: hesapIds.banka, karsi_hesap_id: hesapIds.nakit, grup_id: grupId,
        tarih, donem, tutar: bankaTutar, tur: 'transfer', kategori: null,
        aciklama: yon === 'yukle' ? 'Nakitten bankaya yükleme' : 'Bankadan nakit çekme', sira: siraBanka,
      },
      {
        hesap_id: hesapIds.nakit, karsi_hesap_id: hesapIds.banka, grup_id: grupId,
        tarih, donem, tutar: nakitTutar, tur: 'transfer', kategori: null,
        aciklama: yon === 'yukle' ? 'Nakitten bankaya yükleme' : 'Bankadan nakit çekme', sira: siraNakit,
      },
    ])
    onKayit()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center px-4 pt-4 pb-20 md:p-4">
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
            <TarihInput value={tarih} onChange={setTarih}
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
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center px-4 pt-4 pb-20 md:p-4">
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
  const [hesapIds, setHesapIds] = useState({ banka: null, nakit: null })
  const [birikimOzet, setBirikimOzet] = useState({})
  const [birikimHesaplar, setBirikimHesaplar] = useState([]) // [{ id, ad, doviz_cinsi, emoji, renk }] — Birikim (TL) kökü + alt hesaplar (DB-driven)
  const [borcOzet, setBorcOzet] = useState({}) // { [doviz]: { kkBorcu, kisiBorc, kisiAlacak } }
  const [kurlar, setKurlar] = useState(null) // { USD, EUR, GBP, ALT, GMS } — TL satış fiyatı, yüklenemezse null
  const [kurYukleniyor, setKurYukleniyor] = useState(false)
  const [transfer, setTransfer] = useState(false)
  const [baslangicFormu, setBaslangicFormu] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = async () => {
    setYukleniyor(true)

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

    // Yeni mimari — Banka/Nakit/Birikim (TL) ve birikim alt-hesap id'lerini, kişi
    // borç hesaplarını ve (değişmeyen) KK verilerini paralel çek
    const [ayarlarRes, hesapListRes, kisiHesaplarRes,
           borcHesaplarRes, borcKalemlerRes, borcHarcamalarRes] = await Promise.all([
      supabase.from('ayarlar').select('anahtar, deger'),
      supabase.from('hesaplar').select('id, ad, doviz_cinsi, emoji, renk').in('ad', ['Banka', 'Nakit', 'Birikim (TL)']),
      supabase.from('hesaplar').select('id, doviz_cinsi').eq('tip', 'borc').eq('aktif', true),
      supabase.from('borc_hesaplar').select('id, tip, doviz_cinsi').eq('aktif', true),
      supabase.from('borc_kalemler').select('hesap_id, tutar, odendi'),
      supabase.from('borc_harcamalar').select('hesap_id, tutar, ekstre_kesildi'),
    ])
    const ayarlarData = ayarlarRes.data
    const hesapList = hesapListRes.data || []
    const bankaId = hesapList.find(h => h.ad === 'Banka')?.id
    const nakitId = hesapList.find(h => h.ad === 'Nakit')?.id
    const birikimRoot = hesapList.find(h => h.ad === 'Birikim (TL)')
    const birikimId = birikimRoot?.id
    setHesapIds({ banka: bankaId, nakit: nakitId })

    // Başlangıç bakiyeleri
    const ayarMap = {}
    for (const a of ayarlarData || []) ayarMap[a.anahtar] = a.deger
    const baslangicBanka = ayarMap['baslangic_banka'] || 0
    const baslangicNakit = ayarMap['baslangic_nakit'] || 0
    setBaslangic({ banka: baslangicBanka, nakit: baslangicNakit })

    // ─── 2. B/N snapshot + birikim alt-hesaplar paralel ────────────────────────
    // Kişi hesapları da burada tanımla (aşağıda snapshot sorgusunda lazım)
    const kisiHesaplar = kisiHesaplarRes.data || []
    const kisiIdleri = kisiHesaplar.map(h => h.id)
    const [bnSnapRes, birikimAltlarRes] = await Promise.all([
      supabase.from('donem_kapanislari')
        .select('hesap_id, kapani_bakiye, donem')
        .in('hesap_id', [bankaId, nakitId]),
      supabase.from('hesaplar')
        .select('id, ad, doviz_cinsi, emoji, renk, tip')
        .eq('ust_hesap_id', birikimId)
        .in('tip', ['birikim', 'yatirim'])
        .eq('aktif', true)
        .order('sira'),
    ])

    // B/N son kapalı dönem
    const bnLatest = {}
    for (const k of bnSnapRes.data || []) {
      if (!bnLatest[k.hesap_id] || k.donem > bnLatest[k.hesap_id].donem)
        bnLatest[k.hesap_id] = k
    }
    const bnHepsinde = [bankaId, nakitId].every(id => bnLatest[id])
    const bnTekDonem = bnHepsinde && bnLatest[bankaId]?.donem === bnLatest[nakitId]?.donem
    const bnKapaliDonem = bnTekDonem ? bnLatest[bankaId].donem : null

    // Birikim hesap listesi
    const birikimListesi = [birikimRoot, ...(birikimAltlarRes.data || [])].filter(Boolean)
    setBirikimHesaplar(birikimListesi)
    const idToAd = {}
    for (const h of birikimListesi) idToAd[h.id] = h.ad
    const birikimIdleri = birikimListesi.map(h => h.id)

    // ─── 3. B/N hareketleri + birikim/kişi snapshot paralel ────────────────────
    // B/N: sadece son kapalı dönem sonrası hareketler (snapshot öncesi zaten dahil)
    // Birikim ve Kişi snapshot'larını aynı anda çek
    const [hareketler, birikimSnapRes, kisiSnapRes] = await Promise.all([
      tumunuCek('hesap_hareketler', 'hesap_id, karsi_hesap_id, tutar, tur', q => {
        const query = q.in('hesap_id', [bankaId, nakitId])
        return bnKapaliDonem ? query.gt('donem', bnKapaliDonem) : query
      }),
      birikimIdleri.length
        ? supabase.from('donem_kapanislari').select('hesap_id, kapani_bakiye, donem').in('hesap_id', birikimIdleri)
        : Promise.resolve({ data: [] }),
      kisiIdleri.length
        ? supabase.from('donem_kapanislari').select('hesap_id, kapani_bakiye, donem').in('hesap_id', kisiIdleri)
        : Promise.resolve({ data: [] }),
    ])

    // Banka/Nakit bakiyesi — gelir/gider/Birikim-kategorili-transfer doğrudan (işaretli)
    // tutar; gerçek Banka↔Nakit iç transferleri sadece Banka bacağından sayılır.
    let bankaNet = 0, nakitNet = 0, transferNet = 0
    for (const r of hareketler) {
      const hesapK = r.hesap_id === bankaId
      if (r.tur === 'gelir' || r.tur === 'gider' || (r.tur === 'transfer' && r.karsi_hesap_id === birikimId)) {
        if (hesapK) bankaNet += r.tutar || 0
        else nakitNet += r.tutar || 0
      } else if (r.tur === 'transfer' && hesapK) {
        // gerçek Banka↔Nakit iç transferi
        transferNet += r.tutar || 0
      }
    }
    // Snapshot varsa kapanış bakiyesi (başlangıcı zaten içerir), yoksa ayar değeri
    const bankaBaslangic = bnKapaliDonem ? (bnLatest[bankaId]?.kapani_bakiye ?? 0) : parseFloat(baslangicBanka || 0)
    const nakitBaslangic = bnKapaliDonem ? (bnLatest[nakitId]?.kapani_bakiye ?? 0) : parseFloat(baslangicNakit || 0)
    const bankaK = bankaBaslangic + bankaNet + transferNet
    const nakitN = nakitBaslangic + nakitNet - transferNet

    // Birikim son kapalı dönem
    const birikimLatest = {}
    for (const k of birikimSnapRes.data || []) {
      if (!birikimLatest[k.hesap_id] || k.donem > birikimLatest[k.hesap_id].donem)
        birikimLatest[k.hesap_id] = k
    }
    const birikimHepsinde = birikimIdleri.every(id => birikimLatest[id])
    const birikimTekDonem = birikimHepsinde && new Set(birikimIdleri.map(id => birikimLatest[id]?.donem)).size === 1
    const birikimKapaliDonem = birikimTekDonem ? birikimLatest[birikimIdleri[0]]?.donem : null

    // Kişi son kapalı dönem
    const kisiLatest = {}
    for (const k of kisiSnapRes.data || []) {
      if (!kisiLatest[k.hesap_id] || k.donem > kisiLatest[k.hesap_id].donem)
        kisiLatest[k.hesap_id] = k
    }
    const kisiHepsinde = kisiIdleri.length > 0 && kisiIdleri.every(id => kisiLatest[id])
    const kisiTekDonem = kisiHepsinde && new Set(kisiIdleri.map(id => kisiLatest[id]?.donem)).size === 1
    const kisiKapaliDonem = kisiTekDonem ? kisiLatest[kisiIdleri[0]]?.donem : null

    // ─── 4. Birikim + kişi hareketleri paralel (sadece açık dönem) ──────────────
    const [birikimHareketleri, kisiHareketleri] = await Promise.all([
      birikimIdleri.length
        ? tumunuCek('hesap_hareketler', 'hesap_id, tutar', q => {
            const query = q.in('hesap_id', birikimIdleri)
            return birikimKapaliDonem ? query.gt('donem', birikimKapaliDonem) : query
          })
        : Promise.resolve([]),
      kisiIdleri.length
        ? tumunuCek('hesap_hareketler', 'hesap_id, tutar', q => {
            const query = q.in('hesap_id', kisiIdleri)
            return kisiKapaliDonem ? query.gt('donem', kisiKapaliDonem) : query
          })
        : Promise.resolve([]),
    ])

    // Birikim özeti — snapshot bakiyesi + sonrası hareketler
    const ozet = {}
    if (birikimKapaliDonem) {
      for (const id of birikimIdleri) {
        const ad = idToAd[id]
        if (ad) ozet[ad] = birikimLatest[id]?.kapani_bakiye ?? 0
      }
    }
    for (const r of birikimHareketleri) {
      const ad = idToAd[r.hesap_id]
      if (!ad) continue
      ozet[ad] = (ozet[ad] || 0) + (r.tutar || 0)
    }

    // TL toplam — Birikim (TL) kökü + tip='birikim' olan TL alt hesaplar.
    // tip='yatirim' olanlar (TL cinsinden olsa bile) elde tutulan varlık değil,
    // yatırılmış para olduğu için "Toplam TL Varlık"a dahil edilmez.
    const birikimTL = birikimListesi
      .filter(h => h.doviz_cinsi === 'TL' && h.tip !== 'yatirim')
      .reduce((s, h) => s + (ozet[h.ad] || 0), 0)

    setBakiye({ K: bankaK, N: nakitN, TL: bankaK + nakitN + birikimTL })
    setBirikimOzet(ozet)

    // Borç/Alacak özet — dövize göre gruplandırılmış
    const bHesaplar = borcHesaplarRes.data || []
    const bKalemler = borcKalemlerRes.data || []
    const bHarcamalar = borcHarcamalarRes.data || []

    const borcOzetMap = {}
    const ensureKey = (doviz) => {
      if (!borcOzetMap[doviz]) borcOzetMap[doviz] = { kkBorcu: 0, kisiBorc: 0, kisiAlacak: 0 }
    }

    // KK hesaplar — değişmedi (borc_hesaplar/borc_kalemler/borc_harcamalar, tip='kk')
    for (const h of bHesaplar.filter(h => h.tip === 'kk')) {
      const doviz = h.doviz_cinsi || 'TL'
      ensureKey(doviz)
      const kalemBorcu = bKalemler
        .filter(k => k.hesap_id === h.id && !k.odendi)
        .reduce((s, k) => s + (k.tutar || 0), 0)
      const bekleyenHarcama = bHarcamalar
        .filter(r => r.hesap_id === h.id && !r.ekstre_kesildi)
        .reduce((s, r) => s + (r.tutar || 0), 0)
      borcOzetMap[doviz].kkBorcu += kalemBorcu + bekleyenHarcama
    }

    // Kişi hesaplar — artık hesaplar (tip='borc') + hesap_hareketler üzerinden okunuyor.
    // AŞAMA 6 işaret çevirisi: yeni modelde pozitif bakiye = "bana borçlular" (alacak),
    // eski gösterimde ise pozitif = "ben borçluyum" — bu yüzden -(toplam) ile eski
    // gösterim işaretine çeviriyoruz (BorcAlacak.jsx'teki shim ile aynı).
    if (kisiHesaplar.length) {
      const kisiToplam = {}
      // Snapshot varsa başlangıç bakiyesi olarak kullan
      if (kisiKapaliDonem) {
        for (const h of kisiHesaplar)
          kisiToplam[h.id] = kisiLatest[h.id]?.kapani_bakiye ?? 0
      }
      for (const r of kisiHareketleri) {
        kisiToplam[r.hesap_id] = (kisiToplam[r.hesap_id] || 0) + (r.tutar || 0)
      }
      for (const h of kisiHesaplar) {
        const doviz = h.doviz_cinsi || 'TL'
        ensureKey(doviz)
        const bak = -(kisiToplam[h.id] || 0)
        if (bak > 0) borcOzetMap[doviz].kisiBorc += bak
        else if (bak < 0) borcOzetMap[doviz].kisiAlacak += Math.abs(bak)
      }
    }

    setBorcOzet(borcOzetMap)

    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])
  useEffect(() => { kurlariGetir(false).then(setKurlar) }, [])

  const kurGuncelAl = async () => {
    setKurYukleniyor(true)
    const k = await kurlariGetir(true)
    setKurlar(k)
    setKurYukleniyor(false)
  }

  if (yukleniyor) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // TL cinsi yatırım hesapları (tip='yatirim') elde tutulan varlık değil —
  // ne Toplam TL Varlık'a ne de Tahmini Tüm Varlıklar'a girer. Döviz/fiziki
  // yatırım hesapları (USD, ALT vb.) ise bu listede kalır — onlar zaten ayrı
  // gösteriliyor ve güncel kurla tahmini değere katkıları doğru.
  const dovizHesaplar = birikimHesaplar
    .filter(h => h.ad !== 'Birikim (TL)' && h.doviz_cinsi !== 'TL')
    .filter(h => birikimOzet[h.ad] && birikimOzet[h.ad] !== 0)

  // Döviz/fiziki varlıkların güncel kurla tahmini TL karşılığı (kur yoksa o hesap atlanır)
  const dovizToplamTL = kurlar
    ? dovizHesaplar.reduce((s, h) => {
        const kur = kurlar[h.doviz_cinsi]
        return kur ? s + (birikimOzet[h.ad] || 0) * kur : s
      }, 0)
    : 0

  const tahminiTumVarliklar = bakiye.TL + dovizToplamTL

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
        <div className="mt-2 bg-slate-800 rounded-xl px-4 py-3 divide-y divide-white/10">
          <div className="flex justify-between items-center pb-2.5">
            <span className="text-sm text-slate-300">Toplam TL Varlık</span>
            <span className="text-lg font-bold text-white">₺{formatPara(bakiye.TL)}</span>
          </div>
          <div className="flex justify-between items-center pt-2.5">
            <span className="text-xs text-slate-400">Tahmini Tüm Varlıklar (TL Karşılığı)</span>
            {kurlar ? (
              <span className="text-base font-bold text-slate-200">₺{formatPara(tahminiTumVarliklar)}</span>
            ) : (
              <span className="text-xs text-slate-500">kur alınamadı</span>
            )}
          </div>
        </div>
      </div>

      {/* Döviz Varlıkları — tamamen DB-driven (hesaplar tablosundaki birikim/yatırım
          alt hesapları + emoji/renk kolonları): yeni hesap eklemek için kod değişikliği gerekmez */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CoinIcon size={15} className="text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Döviz & Fiziki Varlıklar</h2>
          </div>
          <button onClick={kurGuncelAl} disabled={kurYukleniyor}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={kurYukleniyor ? 'animate-spin' : ''} /> Güncel Kur Al
          </button>
        </div>
        {(() => {
          const birikimRootHesap = birikimHesaplar.find(h => h.ad === 'Birikim (TL)')

          if (dovizHesaplar.length === 0) {
            return (
              <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
                Henüz varlık kaydı yok.
              </div>
            )
          }
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {birikimRootHesap && (
                <div className={`rounded-2xl p-4 border ${birikimRootHesap.renk || VARSAYILAN_RENK}`}>
                  <p className="text-xs font-semibold opacity-60 mb-1">{birikimRootHesap.emoji || VARSAYILAN_EMOJI} {birikimRootHesap.ad}</p>
                  <p className="text-xl font-bold">₺{formatPara(birikimOzet[birikimRootHesap.ad] || 0)}</p>
                </div>
              )}
              {dovizHesaplar.map(h => {
                const kur = kurlar?.[h.doviz_cinsi]
                return (
                  <div key={h.ad} className={`rounded-2xl p-4 border ${h.renk || VARSAYILAN_RENK}`}>
                    <p className="text-xs font-semibold opacity-60 mb-1">{h.emoji || VARSAYILAN_EMOJI} {h.ad}</p>
                    <p className="text-xl font-bold">{formatPara(birikimOzet[h.ad])} {h.doviz_cinsi}</p>
                    {kur && (
                      <p className="text-[10px] opacity-50 mt-0.5">≈ ₺{formatPara(birikimOzet[h.ad] * kur)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Borç & Alacak */}
      {Object.keys(borcOzet).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Borç & Alacak</h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Başlık satırı */}
            <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400">
              <div className="px-4 py-2.5">Para Birimi</div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1">
                <CreditCard size={11} /> KK Borcu
              </div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1">
                <TrendingDown size={11} /> Borcum
              </div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1">
                <TrendingUp size={11} /> Alacağım
              </div>
            </div>

            {/* Döviz satırları */}
            {(['TL','USD','EUR','GBP','ALT','GMS']).filter(d => borcOzet[d]).map(doviz => {
              const { kkBorcu, kisiBorc, kisiAlacak } = borcOzet[doviz]
              const SEM = { TL:'₺', USD:'$', EUR:'€', GBP:'£', ALT:'gr ALT', GMS:'gr GMS' }
              const sem = SEM[doviz] || doviz
              const fmt = (v) => doviz === 'ALT' || doviz === 'GMS'
                ? `${formatPara(v)} ${doviz === 'ALT' ? 'gr' : 'gr'}`
                : `${sem}${formatPara(v)}`
              return (
                <div key={doviz} className="grid grid-cols-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="px-4 py-3 font-bold text-sm text-slate-700">{doviz}</div>
                  <div className="px-3 py-3 text-right text-sm font-bold text-purple-600">
                    {kkBorcu > 0 ? fmt(kkBorcu) : <span className="text-slate-300">—</span>}
                  </div>
                  <div className="px-3 py-3 text-right text-sm font-bold text-red-500">
                    {kisiBorc > 0 ? fmt(kisiBorc) : <span className="text-slate-300">—</span>}
                  </div>
                  <div className="px-3 py-3 text-right text-sm font-bold text-green-600">
                    {kisiAlacak > 0 ? fmt(kisiAlacak) : <span className="text-slate-300">—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {transfer && <TransferFormu hesapIds={hesapIds} onKapat={() => setTransfer(false)} onKayit={() => { setTransfer(false); yukle() }} />}
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
