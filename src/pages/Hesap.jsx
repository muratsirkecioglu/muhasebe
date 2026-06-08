import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, donemLabel, buDonem } from '../db'
import { useMask } from '../MaskContext'
import { Settings, Plus, Pencil, Trash2, X } from 'lucide-react'

const BASLANGIC_DONEM = 201604
const BASLANGIC_K = 269
const BASLANGIC_N = 35

// Hesap Yönetimi formunda seçilebilecek tip ve renk seçenekleri.
// NOT: Bunlar form arayüzünün kendi seçenekleridir (DB'deki check kısıtı ve
// Tailwind sınıf paleti ile sınırlı) — hesap TANIMLARI değildir; hesap listesi
// her zaman doğrudan `hesaplar` tablosundan dinamik okunur.
const TIP_SECENEKLERI = [
  { deger: 'ANA_HESAP', etiket: 'Ana Hesap (rollup — kendi hareketi olmaz)' },
  { deger: 'banka', etiket: 'Banka' },
  { deger: 'nakit', etiket: 'Nakit' },
  { deger: 'birikim', etiket: 'Birikim (varlık değeri takibi)' },
  { deger: 'yatirim', etiket: 'Yatırım (net kâr/zarar takibi)' },
  { deger: 'borc', etiket: 'Borç/Alacak (kişi)' },
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
const VARSAYILAN_RENK = 'bg-slate-50 border-slate-200 text-slate-700'

function HesapFormu({ kayit, hesaplar, onKapat, onKayit }) {
  const duzenleModu = !!kayit
  const [form, setForm] = useState({
    ad: kayit?.ad || '',
    ust_hesap_id: kayit?.ust_hesap_id != null ? String(kayit.ust_hesap_id) : '',
    tip: kayit?.tip || 'birikim',
    doviz_cinsi: kayit?.doviz_cinsi || 'TL',
    emoji: kayit?.emoji || '',
    renk: kayit?.renk || '',
    sira: kayit?.sira != null ? String(kayit.sira) : '',
    aciklama: kayit?.aciklama || '',
    aktif: kayit?.aktif ?? true,
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.ad.trim()) { setHata('Hesap adı zorunlu'); return }
    setKaydediliyor(true)
    setHata('')
    const payload = {
      ad: form.ad.trim(),
      ust_hesap_id: form.ust_hesap_id ? Number(form.ust_hesap_id) : null,
      tip: form.tip,
      doviz_cinsi: (form.doviz_cinsi.trim() || 'TL').toUpperCase(),
      emoji: form.emoji.trim() || null,
      renk: form.renk || null,
      sira: form.sira !== '' ? Number(form.sira) : null,
      aciklama: form.aciklama.trim() || null,
      aktif: form.aktif,
    }
    const { error } = duzenleModu
      ? await supabase.from('hesaplar').update(payload).eq('id', kayit.id)
      : await supabase.from('hesaplar').insert(payload)
    if (error) {
      setHata(error.message)
      setKaydediliyor(false)
      return
    }
    onKayit(); onKapat()
  }

  // Döngü oluşmasın diye düzenlenen hesabın kendisi üst-hesap seçeneklerinden çıkarılır
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
  const [form, setForm] = useState(null)       // null | {} (yeni) | kayit (düzenle)
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

  // Hiyerarşiyi (kök → alt → alt-alt ...) derinliğine bakmaksızın doğrudan
  // ust_hesap_id ilişkisinden türet — yeni bir seviye eklense bile kod değişmez
  const altlarGetir = (ustId) => hesaplar.filter(h => h.ust_hesap_id === ustId)
  const kokler = altlarGetir(null)

  const pasiflestir = async (h) => {
    await supabase.from('hesaplar').update({ aktif: false }).eq('id', h.id)
    setSilinecek(null)
    yukle()
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
            <div className="space-y-0.5">
              {kokler.map(kok => renderHesap(kok, 0))}
            </div>
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
              <strong>{silinecek.ad}</strong> hesabı pasifleştirilsin mi? Geçmiş hareketleri etkilenmez, sadece ekranlarda artık görünmez.
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

async function aylikVerileriHesapla() {
  // Tüm kayıtları sayfalı olarak çek
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

  // Banka / Nakit / Birikim (TL) hesap id'lerini bul (yeni mimari: hesaplar + hesap_hareketler)
  const { data: hesapList } = await supabase.from('hesaplar').select('id, ad').in('ad', ['Banka', 'Nakit', 'Birikim (TL)'])
  const bankaId = hesapList?.find(h => h.ad === 'Banka')?.id
  const nakitId = hesapList?.find(h => h.ad === 'Nakit')?.id
  const birikimId = hesapList?.find(h => h.ad === 'Birikim (TL)')?.id

  const [hareketler, { data: ayarlar }] = await Promise.all([
    tumunuCek('hesap_hareketler', 'donem, hesap_id, karsi_hesap_id, tutar, tur', q => q.in('hesap_id', [bankaId, nakitId])),
    supabase.from('ayarlar').select('anahtar, deger'),
  ])

  const ayarMap = {}
  for (const a of ayarlar || []) ayarMap[a.anahtar] = a.deger
  const baslangicK = ayarMap['baslangic_banka'] ?? BASLANGIC_K
  const baslangicN = ayarMap['baslangic_nakit'] ?? BASLANGIC_N

  // Tüm dönemleri topla
  const donemler = new Set()
  for (const r of hareketler) {
    if (r.donem) donemler.add(r.donem)
  }
  const sirali = [...donemler].filter(d => d >= BASLANGIC_DONEM).sort()

  // Dönem bazlı grupla — tur'a göre ayrıştır (gider/gelir/transfer)
  // ÖNEMLİ AYRIM: 'transfer' türündeki kayıtların hepsi gerçek Banka↔Nakit iç
  // transferi DEĞİL — İşlemler ekranında "Birikim" kategorisiyle girilen gider/gelir
  // kayıtları da artık (Banka/Nakit ↔ Birikim (TL)) gerçek transfer çifti olarak
  // saklanıyor (bkz. Islemler.jsx). Eski mimaride bunlar `giderler`/`gelirler`
  // tablosunda kategori='Birikim' satırlarıydı ve Hesap Özeti'nde normal gider/gelir
  // gibi sayılıyordu (K/N havuzundan gerçek çıkış/giriş). O davranışla birebir
  // eşleşmesi için: karsi_hesap_id === birikimId olan transfer kayıtlarını gider/gelir
  // gibi say; sadece Banka↔Nakit arasındaki gerçek iç transferleri transferNet'e ekle.
  //
  // Gerçek iç transferler simetrik olduğundan, sadece Banka bacağındaki tutar = net
  // (Nakit→Banka - Banka→Nakit) değerini verir; bu da eski nk.K - nk.N net'iyle
  // birebir eşleşir (brüt K/N ayrımı artık tutulmuyor, AŞAMA 1 migrasyonunda netleme
  // kararı zaten alınmıştı).
  const map = {}
  for (const r of hareketler) {
    if (!r.donem) continue
    if (!map[r.donem]) map[r.donem] = { gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0 }
    const m = map[r.donem]
    const hesapK = r.hesap_id === bankaId
    if (r.tur === 'gelir') {
      if (hesapK) m.gelirK += r.tutar || 0
      else m.gelirN += r.tutar || 0
    } else if (r.tur === 'gider') {
      if (hesapK) m.giderK += -(r.tutar || 0)
      else m.giderN += -(r.tutar || 0)
    } else if (r.tur === 'transfer') {
      if (r.karsi_hesap_id === birikimId) {
        // "Birikim" kategorili gider/gelir muadili — K/N havuzu açısından gerçek çıkış/giriş
        if ((r.tutar || 0) < 0) {
          if (hesapK) m.giderK += -(r.tutar || 0)
          else m.giderN += -(r.tutar || 0)
        } else {
          if (hesapK) m.gelirK += r.tutar || 0
          else m.gelirN += r.tutar || 0
        }
      } else if (hesapK) {
        // gerçek Banka↔Nakit iç transferi
        m.transferNet += r.tutar || 0
      }
    }
  }

  // Kümülatif hesapla
  let cumK = baslangicK, cumN = baslangicN
  const satirlar = []

  // Başlangıç satırı
  satirlar.push({ donem: BASLANGIC_DONEM, gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0, bakiyeK: cumK, bakiyeN: cumN, ilk: true })

  for (const d of sirali) {
    if (d === BASLANGIC_DONEM) continue
    const m = map[d] || { gelirK: 0, gelirN: 0, giderK: 0, giderN: 0, transferNet: 0 }

    cumK = cumK + m.gelirK - m.giderK + m.transferNet
    cumN = cumN + m.gelirN - m.giderN - m.transferNet

    satirlar.push({ donem: d, gelirK: m.gelirK, gelirN: m.gelirN, giderK: m.giderK, giderN: m.giderN, transferNet: m.transferNet, bakiyeK: cumK, bakiyeN: cumN })
  }

  return satirlar
}

export default function Hesap() {
  const { maskeli } = useMask()
  const gizle = (deger) => maskeli ? '••••' : (deger !== 0 ? formatPara(deger) : '—')
  const [satirlar, setSatirlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState('son6') // 'son6' | 'son12' | 'tamami'
  const [yonetimAcik, setYonetimAcik] = useState(false)
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
        <div className="flex items-center gap-2">
          {[['son6', 'Son 6 Ay'], ['son12', 'Son 12 Ay'], ['tamami', 'Tümü']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                filtre === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
              }`}>
              {label}
            </button>
          ))}
          <button onClick={() => setYonetimAcik(true)}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Hesap Yönetimi — yeni hesap ekle / mevcutları düzenle">
            <Settings size={15} />
          </button>
        </div>
      </div>

      {yonetimAcik && <HesapYonetimi onKapat={() => setYonetimAcik(false)} />}

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
