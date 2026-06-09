import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, yerelTarih, donemLabel, buDonem } from '../db'
import { useMask } from '../MaskContext'
import {
  Landmark, Banknote, ArrowLeftRight, Settings, CreditCard, TrendingDown, TrendingUp,
  Plus, Pencil, Trash2, X, Lock,
} from 'lucide-react'
import CoinIcon from '../components/CoinIcon'
import TarihInput from '../components/TarihInput'

// ─── Sabitler ────────────────────────────────────────────────────────────────
const VARSAYILAN_EMOJI = '💼'
const VARSAYILAN_RENK  = 'bg-slate-50 border-slate-200 text-slate-700'
const BASLANGIC_DONEM  = 201604
const BASLANGIC_K      = 269
const BASLANGIC_N      = 35

// ─── Hesap Yönetimi ──────────────────────────────────────────────────────────

const TIP_SECENEKLERI = [
  { deger: 'ANA_HESAP', etiket: 'Ana Hesap (rollup — kendi hareketi olmaz)' },
  { deger: 'banka',     etiket: 'Banka' },
  { deger: 'nakit',     etiket: 'Nakit' },
  { deger: 'birikim',   etiket: 'Birikim (varlık değeri takibi)' },
  { deger: 'yatirim',   etiket: 'Yatırım (net kâr/zarar takibi)' },
  { deger: 'borc',      etiket: 'Borç/Alacak (kişi)' },
]

const RENK_SECENEKLERI = [
  { ad: 'Mavi',    sinif: 'bg-blue-50 border-blue-200 text-blue-800' },
  { ad: 'Yeşil',   sinif: 'bg-green-50 border-green-200 text-green-800' },
  { ad: 'Kırmızı', sinif: 'bg-red-50 border-red-200 text-red-800' },
  { ad: 'Sarı',    sinif: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { ad: 'Turuncu', sinif: 'bg-orange-50 border-orange-200 text-orange-800' },
  { ad: 'Amber',   sinif: 'bg-amber-50 border-amber-200 text-amber-800' },
  { ad: 'Lime',    sinif: 'bg-lime-50 border-lime-200 text-lime-800' },
  { ad: 'Teal',    sinif: 'bg-teal-50 border-teal-200 text-teal-800' },
  { ad: 'İndigo',  sinif: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { ad: 'Mor',     sinif: 'bg-purple-50 border-purple-200 text-purple-800' },
  { ad: 'Pembe',   sinif: 'bg-pink-50 border-pink-200 text-pink-800' },
  { ad: 'Gül',     sinif: 'bg-rose-50 border-rose-200 text-rose-800' },
  { ad: 'Slate',   sinif: 'bg-slate-50 border-slate-200 text-slate-700' },
]

function HesapFormu({ kayit, hesaplar, onKapat, onKayit }) {
  const duzenleModu = !!kayit
  const [form, setForm] = useState({
    ad:           kayit?.ad || '',
    ust_hesap_id: kayit?.ust_hesap_id != null ? String(kayit.ust_hesap_id) : '',
    tip:          kayit?.tip || 'birikim',
    doviz_cinsi:  kayit?.doviz_cinsi || 'TL',
    emoji:        kayit?.emoji || '',
    renk:         kayit?.renk || '',
    sira:         kayit?.sira != null ? String(kayit.sira) : '',
    aciklama:     kayit?.aciklama || '',
    aktif:        kayit?.aktif ?? true,
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.ad.trim()) { setHata('Hesap adı zorunlu'); return }
    setKaydediliyor(true); setHata('')
    const payload = {
      ad:           form.ad.trim(),
      ust_hesap_id: form.ust_hesap_id ? Number(form.ust_hesap_id) : null,
      tip:          form.tip,
      doviz_cinsi:  (form.doviz_cinsi.trim() || 'TL').toUpperCase(),
      emoji:        form.emoji.trim() || null,
      renk:         form.renk || null,
      sira:         form.sira !== '' ? Number(form.sira) : null,
      aciklama:     form.aciklama.trim() || null,
      aktif:        form.aktif,
    }
    const { error } = duzenleModu
      ? await supabase.from('hesaplar').update(payload).eq('id', kayit.id)
      : await supabase.from('hesaplar').insert(payload)
    if (error) { setHata(error.message); setKaydediliyor(false); return }
    onKayit(); onKapat()
  }

  const ustSecenekleri = hesaplar.filter(h => h.id !== kayit?.id)

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{duzenleModu ? `✏️ ${kayit.ad} — Düzenle` : '➕ Yeni Hesap'}</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Üst Hesap</label>
            <select value={form.ust_hesap_id} onChange={e => setForm(f => ({ ...f, ust_hesap_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— Yok (kök hesap) —</option>
              {ustSecenekleri.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tip</label>
            <select value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {TIP_SECENEKLERI.map(t => <option key={t.deger} value={t.deger}>{t.etiket}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Döviz Cinsi</label>
              <input type="text" value={form.doviz_cinsi} onChange={e => setForm(f => ({ ...f, doviz_cinsi: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="TL" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Sıra</label>
              <input type="number" value={form.sira} onChange={e => setForm(f => ({ ...f, sira: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="—" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Emoji</label>
              <input type="text" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="💼" maxLength={4} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Renk</label>
              <select value={form.renk} onChange={e => setForm(f => ({ ...f, renk: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">— Varsayılan —</option>
                {RENK_SECENEKLERI.map(r => <option key={r.sinif} value={r.sinif}>{r.ad}</option>)}
              </select>
            </div>
          </div>
          <div className={`rounded-xl p-3 border text-xs ${form.renk || VARSAYILAN_RENK}`}>
            <span className="font-semibold opacity-60">Önizleme: </span>{form.emoji || '💼'} {form.ad || 'Hesap Adı'}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {duzenleModu && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))}
                className="rounded border-slate-300" />
              Aktif
            </label>
          )}
          {hata && <p className="text-xs text-red-500">{hata}</p>}
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

function HesapYonetimi({ onKapat }) {
  const [hesaplar, setHesaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [form, setForm] = useState(null)
  const [silinecek, setSilinecek] = useState(null)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const { data } = await supabase.from('hesaplar')
      .select('id, ad, ust_hesap_id, tip, doviz_cinsi, emoji, renk, sira, aciklama, aktif')
      .order('sira', { ascending: true, nullsFirst: false })
    setHesaplar(data || [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const altlarGetir = (ustId) => hesaplar.filter(h => h.ust_hesap_id === ustId)
  const kokler = altlarGetir(null)

  const pasiflestir = async (h) => {
    await supabase.from('hesaplar').update({ aktif: false }).eq('id', h.id)
    setSilinecek(null); yukle()
  }

  const renderHesap = (h, derinlik) => (
    <div key={h.id}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors ${!h.aktif ? 'opacity-40' : ''}`}
        style={{ marginLeft: derinlik * 18 }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{h.emoji || '💼'}</span>
          <span className="text-sm font-medium text-slate-700 truncate">{h.ad}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 shrink-0">{h.tip}</span>
          {h.doviz_cinsi !== 'TL' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 shrink-0">{h.doviz_cinsi}</span>
          )}
          {!h.aktif && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-50 text-red-400 shrink-0">pasif</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setForm(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Düzenle">
            <Pencil size={14} />
          </button>
          {h.aktif && (
            <button onClick={() => setSilinecek(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Pasifleştir">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {altlarGetir(h.id).map(alt => renderHesap(alt, derinlik + 1))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">⚙️ Hesap Yönetimi</h3>
          <button onClick={onKapat} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {yukleniyor ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hesaplar.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Henüz hesap tanımı yok.</div>
          ) : (
            <div className="space-y-0.5">{kokler.map(kok => renderHesap(kok, 0))}</div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setForm({})} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-1.5">
            <Plus size={16} /> Yeni Hesap
          </button>
        </div>
      </div>
      {form !== null && (
        <HesapFormu kayit={form?.id ? form : null} hesaplar={hesaplar} onKapat={() => setForm(null)} onKayit={yukle} />
      )}
      {silinecek && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5">
            <p className="text-sm text-slate-700 mb-4">
              <strong>{silinecek.ad}</strong> hesabı pasifleştirilsin mi? Geçmiş hareketleri etkilenmez.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSilinecek(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
              <button onClick={() => pasiflestir(silinecek)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">Pasifleştir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Transfer ve Başlangıç Formları ──────────────────────────────────────────

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
    const grupId = crypto.randomUUID()
    const bankaTutar = yon === 'yukle' ? t : -t
    const nakitTutar = -bankaTutar
    const [siraBanka, siraNakit] = await Promise.all([
      hesapHareketSiraGetir(hesapIds.banka),
      hesapHareketSiraGetir(hesapIds.nakit),
    ])
    await supabase.from('hesap_hareketler').insert([
      { hesap_id: hesapIds.banka, karsi_hesap_id: hesapIds.nakit, grup_id: grupId,
        tarih, donem, tutar: bankaTutar, tur: 'transfer', kategori: null,
        aciklama: yon === 'yukle' ? 'Nakitten bankaya yükleme' : 'Bankadan nakit çekme', sira: siraBanka },
      { hesap_id: hesapIds.nakit, karsi_hesap_id: hesapIds.banka, grup_id: grupId,
        tarih, donem, tutar: nakitTutar, tur: 'transfer', kategori: null,
        aciklama: yon === 'yukle' ? 'Nakitten bankaya yükleme' : 'Bankadan nakit çekme', sira: siraNakit },
    ])
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
    onKayit(); onKapat()
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

// ─── Ana bileşen — Dashboard + Hesap birleşik sayfa ─────────────────────────
export default function Ana() {
  const { maskeli } = useMask()
  const gizle = (deger) => maskeli ? '••••' : (deger !== 0 ? formatPara(deger) : '—')

  // Dashboard state
  const [bakiye, setBakiye] = useState({ K: 0, N: 0, TL: 0 })
  const [baslangic, setBaslangic] = useState({ banka: 0, nakit: 0 })
  const [hesapIds, setHesapIds] = useState({ banka: null, nakit: null })
  const [birikimOzet, setBirikimOzet] = useState({})
  const [birikimHesaplar, setBirikimHesaplar] = useState([])
  const [borcOzet, setBorcOzet] = useState({})
  const [transfer, setTransfer] = useState(false)
  const [baslangicFormu, setBaslangicFormu] = useState(false)

  // Hesap state
  const [satirlar, setSatirlar] = useState([])
  const [meta, setMeta] = useState(null)
  const [filtre, setFiltre] = useState('son6')
  const [yonetimAcik, setYonetimAcik] = useState(false)
  const [acmaOnay, setAcmaOnay] = useState(null)
  const [kapaniyor, setKapaniyor] = useState(null)
  const mevcutDonem = buDonem()

  // Shared
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
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

    // ─── Tier 1: Metadata ────────────────────────────────────────────────────
    const [hesapListRes, ayarlarRes, kisiHesaplarRes,
           borcHesaplarRes, borcKalemlerRes, borcHarcamalarRes] = await Promise.all([
      supabase.from('hesaplar').select('id, ad, doviz_cinsi, emoji, renk').in('ad', ['Banka', 'Nakit', 'Birikim (TL)']),
      supabase.from('ayarlar').select('anahtar, deger'),
      supabase.from('hesaplar').select('id, doviz_cinsi').eq('tip', 'borc').eq('aktif', true),
      supabase.from('borc_hesaplar').select('id, tip, doviz_cinsi').eq('aktif', true),
      supabase.from('borc_kalemler').select('hesap_id, tutar, odendi'),
      supabase.from('borc_harcamalar').select('hesap_id, tutar, ekstre_kesildi'),
    ])

    const hesapList = hesapListRes.data || []
    const bankaId    = hesapList.find(h => h.ad === 'Banka')?.id
    const nakitId    = hesapList.find(h => h.ad === 'Nakit')?.id
    const birikimRoot = hesapList.find(h => h.ad === 'Birikim (TL)')
    const birikimId  = birikimRoot?.id
    setHesapIds({ banka: bankaId, nakit: nakitId })

    const ayarMap = {}
    for (const a of ayarlarRes.data || []) ayarMap[a.anahtar] = a.deger
    const baslangicBanka = parseFloat(ayarMap['baslangic_banka'] ?? BASLANGIC_K)
    const baslangicNakit = parseFloat(ayarMap['baslangic_nakit'] ?? BASLANGIC_N)
    setBaslangic({ banka: baslangicBanka, nakit: baslangicNakit })

    const kisiHesaplar = kisiHesaplarRes.data || []
    const kisiIdleri   = kisiHesaplar.map(h => h.id)

    // ─── Tier 2: BN kapanıslar (tüm tarih) + birikim alt-hesaplar ────────────
    // BN kapanıslarını tam tarih olarak çekiyoruz: hem Hesap tablosu (dönem dönem
    // kapanisMap) hem Dashboard (sadece son snapshot) aynı sonuçtan türetilir.
    const [bnKapanislarRes, birikimAltlarRes] = await Promise.all([
      supabase.from('donem_kapanislari')
        .select('donem, hesap_id, kapani_bakiye, donem_gelir, donem_gider, donem_transfer_net')
        .in('hesap_id', [bankaId, nakitId])
        .order('donem', { ascending: true }),
      supabase.from('hesaplar')
        .select('id, ad, doviz_cinsi, emoji, renk')
        .eq('ust_hesap_id', birikimId)
        .in('tip', ['birikim', 'yatirim'])
        .eq('aktif', true)
        .order('sira'),
    ])

    // Kapanısları işle — Hesap tablosu için kapanisMap, Dashboard için bnLatest
    const kapanislarRaw = bnKapanislarRes.data || []
    const kapanisMap = {}   // dönem → { banka, nakit }  (Hesap tablosu)
    const bnLatest   = {}   // hesap_id → son snapshot   (Dashboard)
    for (const k of kapanislarRaw) {
      if (!kapanisMap[k.donem]) kapanisMap[k.donem] = {}
      if (k.hesap_id === bankaId) kapanisMap[k.donem].banka = k
      if (k.hesap_id === nakitId) kapanisMap[k.donem].nakit = k
      if (!bnLatest[k.hesap_id] || k.donem > bnLatest[k.hesap_id].donem)
        bnLatest[k.hesap_id] = k
    }
    const kapaliDonemler = new Set(Object.keys(kapanisMap).map(Number))
    const sonKapaliDonem = kapaliDonemler.size > 0 ? Math.max(...kapaliDonemler) : null

    // Dashboard için bnKapaliDonem: her iki hesap da aynı döneme kapanmışsa kullan
    const bnHepsinde = [bankaId, nakitId].every(id => bnLatest[id])
    const bnTekDonem = bnHepsinde && bnLatest[bankaId]?.donem === bnLatest[nakitId]?.donem
    const bnKapaliDonem = bnTekDonem ? bnLatest[bankaId].donem : null

    const birikimListesi = [birikimRoot, ...(birikimAltlarRes.data || [])].filter(Boolean)
    setBirikimHesaplar(birikimListesi)
    const idToAd     = {}
    for (const h of birikimListesi) idToAd[h.id] = h.ad
    const birikimIdleri = birikimListesi.map(h => h.id)

    // ─── Tier 3: BN hareketler + birikim/kişi snapshot (paralel) ────────────
    // 'donem' kolonu eklendi: Hesap tablosu için dönem bazlı gruplama gerekli
    const [hareketler, birikimSnapRes, kisiSnapRes] = await Promise.all([
      tumunuCek('hesap_hareketler', 'donem, hesap_id, karsi_hesap_id, tutar, tur', q => {
        const query = q.in('hesap_id', [bankaId, nakitId])
        return sonKapaliDonem ? query.gt('donem', sonKapaliDonem) : query
      }),
      birikimIdleri.length
        ? supabase.from('donem_kapanislari').select('hesap_id, kapani_bakiye, donem').in('hesap_id', birikimIdleri)
        : Promise.resolve({ data: [] }),
      kisiIdleri.length
        ? supabase.from('donem_kapanislari').select('hesap_id, kapani_bakiye, donem').in('hesap_id', kisiIdleri)
        : Promise.resolve({ data: [] }),
    ])

    // Birikim + kişi son kapalı dönem
    const birikimLatest = {}
    for (const k of birikimSnapRes.data || []) {
      if (!birikimLatest[k.hesap_id] || k.donem > birikimLatest[k.hesap_id].donem)
        birikimLatest[k.hesap_id] = k
    }
    const birikimHepsinde  = birikimIdleri.every(id => birikimLatest[id])
    const birikimTekDonem  = birikimHepsinde && new Set(birikimIdleri.map(id => birikimLatest[id]?.donem)).size === 1
    const birikimKapaliDonem = birikimTekDonem ? birikimLatest[birikimIdleri[0]]?.donem : null

    const kisiLatest = {}
    for (const k of kisiSnapRes.data || []) {
      if (!kisiLatest[k.hesap_id] || k.donem > kisiLatest[k.hesap_id].donem)
        kisiLatest[k.hesap_id] = k
    }
    const kisiHepsinde  = kisiIdleri.length > 0 && kisiIdleri.every(id => kisiLatest[id])
    const kisiTekDonem  = kisiHepsinde && new Set(kisiIdleri.map(id => kisiLatest[id]?.donem)).size === 1
    const kisiKapaliDonem = kisiTekDonem ? kisiLatest[kisiIdleri[0]]?.donem : null

    // ─── Tier 4: Birikim + kişi hareketler (paralel, sadece açık dönem) ──────
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

    // ─── Hesaplamalar ─────────────────────────────────────────────────────────

    // Dashboard: Banka/Nakit toplam bakiye
    let bankaNet = 0, nakitNet = 0, transferNet = 0
    for (const r of hareketler) {
      const hesapK = r.hesap_id === bankaId
      if (r.tur === 'gelir' || r.tur === 'gider' || (r.tur === 'transfer' && r.karsi_hesap_id === birikimId)) {
        if (hesapK) bankaNet += r.tutar || 0
        else        nakitNet += r.tutar || 0
      } else if (r.tur === 'transfer' && hesapK) {
        transferNet += r.tutar || 0
      }
    }
    const bankaBaslangic = bnKapaliDonem ? (bnLatest[bankaId]?.kapani_bakiye ?? 0) : baslangicBanka
    const nakitBaslangic = bnKapaliDonem ? (bnLatest[nakitId]?.kapani_bakiye ?? 0) : baslangicNakit
    const bankaK = bankaBaslangic + bankaNet + transferNet
    const nakitN = nakitBaslangic + nakitNet - transferNet

    // Dashboard: Birikim özeti
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
    const birikimTL = birikimListesi
      .filter(h => h.doviz_cinsi === 'TL')
      .reduce((s, h) => s + (ozet[h.ad] || 0), 0)
    setBakiye({ K: bankaK, N: nakitN, TL: bankaK + nakitN + birikimTL })
    setBirikimOzet(ozet)

    // Dashboard: Borç/Alacak özeti
    const bHesaplar  = borcHesaplarRes.data || []
    const bKalemler  = borcKalemlerRes.data || []
    const bHarcamalar = borcHarcamalarRes.data || []
    const borcOzetMap = {}
    const ensureKey  = (doviz) => {
      if (!borcOzetMap[doviz]) borcOzetMap[doviz] = { kkBorcu: 0, kisiBorc: 0, kisiAlacak: 0 }
    }
    for (const h of bHesaplar.filter(h => h.tip === 'kk')) {
      const doviz = h.doviz_cinsi || 'TL'; ensureKey(doviz)
      const kalemBorcu = bKalemler.filter(k => k.hesap_id === h.id && !k.odendi).reduce((s, k) => s + (k.tutar || 0), 0)
      const bekleyenHarcama = bHarcamalar.filter(r => r.hesap_id === h.id && !r.ekstre_kesildi).reduce((s, r) => s + (r.tutar || 0), 0)
      borcOzetMap[doviz].kkBorcu += kalemBorcu + bekleyenHarcama
    }
    if (kisiHesaplar.length) {
      const kisiToplam = {}
      if (kisiKapaliDonem) {
        for (const h of kisiHesaplar) kisiToplam[h.id] = kisiLatest[h.id]?.kapani_bakiye ?? 0
      }
      for (const r of kisiHareketleri) {
        kisiToplam[r.hesap_id] = (kisiToplam[r.hesap_id] || 0) + (r.tutar || 0)
      }
      for (const h of kisiHesaplar) {
        const doviz = h.doviz_cinsi || 'TL'; ensureKey(doviz)
        const bak = -(kisiToplam[h.id] || 0)
        if (bak > 0)      borcOzetMap[doviz].kisiBorc   += bak
        else if (bak < 0) borcOzetMap[doviz].kisiAlacak += Math.abs(bak)
      }
    }
    setBorcOzet(borcOzetMap)

    // Hesap tablosu: aynı hareketler dizisinden dönem bazlı kırılım
    const periodMap = {}
    for (const r of hareketler) {
      if (!r.donem) continue
      if (!periodMap[r.donem]) periodMap[r.donem] = { gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0 }
      const m = periodMap[r.donem]
      const hesapK = r.hesap_id === bankaId
      if (r.tur === 'gelir') {
        if (hesapK) m.gelirK += r.tutar || 0
        else        m.gelirN += r.tutar || 0
      } else if (r.tur === 'gider') {
        if (hesapK) m.giderK += -(r.tutar || 0)
        else        m.giderN += -(r.tutar || 0)
      } else if (r.tur === 'transfer') {
        if (r.karsi_hesap_id === birikimId) {
          if ((r.tutar || 0) < 0) {
            if (hesapK) m.giderK += -(r.tutar || 0)
            else        m.giderN += -(r.tutar || 0)
          } else {
            if (hesapK) m.gelirK += r.tutar || 0
            else        m.gelirN += r.tutar || 0
          }
        } else if (hesapK) {
          m.transferNet += r.tutar || 0
        }
      }
    }

    const satirlarYeni = []
    // 1. Başlangıç satırı
    satirlarYeni.push({ donem: BASLANGIC_DONEM, gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0, bakiyeK: baslangicBanka, bakiyeN: baslangicNakit, ilk: true, kapali: false })
    // 2. Kapalı dönem satırları — snapshot'tan doğrudan
    for (const d of [...kapaliDonemler].sort((a, b) => a - b)) {
      const b = kapanisMap[d].banka
      const n = kapanisMap[d].nakit
      satirlarYeni.push({
        donem: d,
        gelirK:      b?.donem_gelir        ?? 0,
        giderK:      b?.donem_gider        ?? 0,
        gelirN:      n?.donem_gelir        ?? 0,
        giderN:      n?.donem_gider        ?? 0,
        transferNet: b?.donem_transfer_net ?? 0,
        bakiyeK:     b?.kapani_bakiye      ?? 0,
        bakiyeN:     n?.kapani_bakiye      ?? 0,
        kapali: true,
      })
    }
    // 3. Açık dönem satırları — hareketlerden hesapla
    let cumK = sonKapaliDonem ? (kapanisMap[sonKapaliDonem].banka?.kapani_bakiye ?? baslangicBanka) : baslangicBanka
    let cumN = sonKapaliDonem ? (kapanisMap[sonKapaliDonem].nakit?.kapani_bakiye ?? baslangicNakit) : baslangicNakit
    const acikDonemler = [...new Set(hareketler.map(r => r.donem).filter(Boolean))].sort((a, b) => a - b)
    for (const d of acikDonemler) {
      if (d <= BASLANGIC_DONEM || kapaliDonemler.has(d)) continue
      const m = periodMap[d] || { gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0 }
      cumK = cumK + m.gelirK - m.giderK + m.transferNet
      cumN = cumN + m.gelirN - m.giderN - m.transferNet
      satirlarYeni.push({ donem: d, gelirK: m.gelirK, gelirN: m.gelirN, giderK: m.giderK, giderN: m.giderN, transferNet: m.transferNet, bakiyeK: cumK, bakiyeN: cumN, kapali: false })
    }
    setSatirlar(satirlarYeni)
    setMeta({ bankaId, nakitId, birikimId })
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  // ─── Dönem kapat / aç ────────────────────────────────────────────────────
  const handleKapat = async (donem) => {
    if (!meta) return
    const r = satirlar.find(s => s.donem === donem)
    if (!r) return
    setKapaniyor(donem)

    const kapanisKayitlari = [
      { donem, hesap_id: meta.bankaId, kapani_bakiye: r.bakiyeK, donem_gelir: r.gelirK, donem_gider: r.giderK, donem_transfer_net: r.transferNet },
      { donem, hesap_id: meta.nakitId, kapani_bakiye: r.bakiyeN, donem_gelir: r.gelirN, donem_gider: r.giderN, donem_transfer_net: 0 },
    ]

    const { data: birikimAltlar } = await supabase
      .from('hesaplar').select('id')
      .eq('ust_hesap_id', meta.birikimId)
      .in('tip', ['birikim', 'yatirim'])
      .eq('aktif', true)
    const birikimIds = [meta.birikimId, ...(birikimAltlar || []).map(h => h.id)]

    const { data: oncekiSnap } = await supabase
      .from('donem_kapanislari').select('donem, hesap_id, kapani_bakiye')
      .in('hesap_id', birikimIds).lt('donem', donem)
    const latestPerAccount = {}
    for (const k of oncekiSnap || []) {
      if (!latestPerAccount[k.hesap_id] || k.donem > latestPerAccount[k.hesap_id].donem)
        latestPerAccount[k.hesap_id] = k
    }

    const hepsindeBulgular = birikimIds.every(id => latestPerAccount[id])
    const donems = birikimIds.map(id => latestPerAccount[id]?.donem)
    const tekDonem = hepsindeBulgular && new Set(donems).size === 1
    const oncekiDonem = tekDonem ? donems[0] : null

    let txQ = supabase.from('hesap_hareketler').select('hesap_id, tutar, donem')
      .in('hesap_id', birikimIds).lte('donem', donem)
    if (oncekiDonem) txQ = txQ.gt('donem', oncekiDonem)
    const { data: birikimHareketler } = await txQ

    const artisMap = {}
    for (const h of birikimHareketler || []) {
      artisMap[h.hesap_id] = (artisMap[h.hesap_id] || 0) + (h.tutar || 0)
    }
    for (const id of birikimIds) {
      const oncekiBakiye = latestPerAccount[id]?.kapani_bakiye ?? 0
      kapanisKayitlari.push({
        donem, hesap_id: id,
        kapani_bakiye: oncekiBakiye + (artisMap[id] ?? 0),
        donem_gelir: 0, donem_gider: 0, donem_transfer_net: 0,
      })
    }

    await supabase.from('donem_kapanislari').upsert(kapanisKayitlari, { onConflict: 'donem,hesap_id' })
    setKapaniyor(null)
    yukle()
  }

  const handleAc = async (donem) => {
    await supabase.from('donem_kapanislari').delete().gte('donem', donem)
    setAcmaOnay(null)
    yukle()
  }

  const gosterilen = (() => {
    const liste = filtre === 'son6'  ? satirlar.slice(-6)
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* ═══════════════════════ DASHBOARD BÖLÜMÜ ═══════════════════════════ */}

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

      {/* Döviz & Fiziki Varlıklar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CoinIcon size={15} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Döviz & Fiziki Varlıklar</h2>
        </div>
        {(() => {
          const birikimRootHesap = birikimHesaplar.find(h => h.ad === 'Birikim (TL)')
          const dovizHesaplar = birikimHesaplar
            .filter(h => h.ad !== 'Birikim (TL)' && h.doviz_cinsi !== 'TL')
            .filter(h => birikimOzet[h.ad] && birikimOzet[h.ad] !== 0)
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
              {dovizHesaplar.map(h => (
                <div key={h.ad} className={`rounded-2xl p-4 border ${h.renk || VARSAYILAN_RENK}`}>
                  <p className="text-xs font-semibold opacity-60 mb-1">{h.emoji || VARSAYILAN_EMOJI} {h.ad}</p>
                  <p className="text-xl font-bold">{formatPara(birikimOzet[h.ad])} {h.doviz_cinsi}</p>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Borç & Alacak */}
      {Object.keys(borcOzet).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Borç & Alacak</h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400">
              <div className="px-4 py-2.5">Para Birimi</div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1"><CreditCard size={11} /> KK Borcu</div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1"><TrendingDown size={11} /> Borcum</div>
              <div className="px-3 py-2.5 text-right flex items-center justify-end gap-1"><TrendingUp size={11} /> Alacağım</div>
            </div>
            {(['TL','USD','EUR','GBP','ALT','GMS']).filter(d => borcOzet[d]).map(doviz => {
              const { kkBorcu, kisiBorc, kisiAlacak } = borcOzet[doviz]
              const SEM = { TL:'₺', USD:'$', EUR:'€', GBP:'£', ALT:'gr ALT', GMS:'gr GMS' }
              const sem = SEM[doviz] || doviz
              const fmt = (v) => (doviz === 'ALT' || doviz === 'GMS') ? `${formatPara(v)} gr` : `${sem}${formatPara(v)}`
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

      {/* ═══════════════════════ HESAP BÖLÜMÜ ═══════════════════════════════ */}
      <div className="border-t border-slate-200 pt-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-700">Aylık Hesap Özeti</h2>
          <div className="flex items-center gap-2">
            {[['son6', 'Son 6 Ay'], ['son12', 'Son 12 Ay'], ['tamami', 'Tümü']].map(([val, label]) => (
              <button key={val} onClick={() => setFiltre(val)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  filtre === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
                }`}>{label}</button>
            ))}
            <button onClick={() => setYonetimAcik(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
              title="Hesap Yönetimi">
              <Settings size={15} />
            </button>
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
                <th className="text-right px-3 py-2.5 font-semibold text-slate-400">Transfer (net)</th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-400">Durum</th>
              </tr>
            </thead>
            <tbody>
              {gosterilen.map((r) => (
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
                  <td className={`px-3 py-2 text-right ${r.transferNet > 0 ? 'text-blue-400' : r.transferNet < 0 ? 'text-slate-500' : 'text-slate-400'} ${r.donem === mevcutDonem ? 'font-bold' : ''}`}
                      title={r.transferNet > 0 ? 'Net: Nakit → Banka' : r.transferNet < 0 ? 'Net: Banka → Nakit' : ''}>
                    {r.transferNet !== 0 ? formatPara(r.transferNet) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.ilk || r.donem === mevcutDonem ? (
                      <span className="text-slate-300 text-[10px]">—</span>
                    ) : r.kapali ? (
                      <button onClick={() => setAcmaOnay(r.donem)} title="Kapalı — yeniden hesaplamak için tıkla"
                        className="text-slate-400 hover:text-amber-500 transition-colors">
                        <Lock size={13} />
                      </button>
                    ) : (
                      <button onClick={() => handleKapat(r.donem)} disabled={kapaniyor === r.donem}
                        className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40">
                        {kapaniyor === r.donem ? '...' : 'Kapat'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Toplam {satirlar.length} ay
          {satirlar.filter(r => r.kapali).length > 0 && (
            <> · <Lock size={10} className="inline mb-0.5" /> {satirlar.filter(r => r.kapali).length} dönem kapalı</>
          )}
          {' · '}Başlangıç: B=₺{formatPara(BASLANGIC_K)}, N=₺{formatPara(BASLANGIC_N)}
        </p>
      </div>

      {/* ═══════════════════════ MODAL'LAR ══════════════════════════════════ */}
      {transfer && (
        <TransferFormu hesapIds={hesapIds} onKapat={() => setTransfer(false)} onKayit={() => { setTransfer(false); yukle() }} />
      )}
      {baslangicFormu && (
        <BaslangicFormu mevcutBanka={baslangic.banka} mevcutNakit={baslangic.nakit}
          onKapat={() => setBaslangicFormu(false)} onKayit={yukle} />
      )}
      {yonetimAcik && <HesapYonetimi onKapat={() => setYonetimAcik(false)} />}
      {acmaOnay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Lock size={18} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Dönemi Yeniden Aç</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              <strong>{donemLabel(acmaOnay)}</strong> dönemi kapalı.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Bu dönem ve sonrasındaki tüm kapalı dönemler yeniden açılacak.
              Verileri kontrol edip dönemleri tekrar kapatmanız gerekecektir.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAcmaOnay(null)}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                İptal
              </button>
              <button onClick={() => handleAc(acmaOnay)}
                className="px-4 py-2 text-sm rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-medium transition-colors">
                Yeniden Aç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
