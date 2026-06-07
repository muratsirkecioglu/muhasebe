import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, yerelTarih } from '../db'
import { Plus, Trash2, Download, Pencil, ChevronUp, ChevronDown } from 'lucide-react'
import TarihInput from '../components/TarihInput'
import * as XLSX from 'xlsx'

function exportExcel(hareketler) {
  const wb = XLSX.utils.book_new()

  // Her hesap için ayrı sheet
  for (const hesap of HESAPLAR) {
    const kayitlar = hareketler
      .filter(r => r.tur === hesap.tur)
      .sort((a, b) => new Date(a.tarih) - new Date(b.tarih))

    if (kayitlar.length === 0) continue

    const rows = kayitlar.map(r => ({
      'Tarih': formatTarih(r.tarih),
      'Alt Tip': r.alt_tip || '',
      'Miktar': r.miktar || 0,
      'Döviz': hesap.doviz,
      'İşlem TL': r.islem_tl || 0,
      'Kur': r.kur || '',
      'Açıklama': r.aciklama || '',
    }))

    // Toplam satırı
    const toplamMiktar = kayitlar.reduce((s, r) => s + (r.miktar || 0), 0)
    const toplamTL = kayitlar.reduce((s, r) => s + (r.islem_tl || 0), 0)
    rows.push({
      'Tarih': 'TOPLAM',
      'Alt Tip': '',
      'Miktar': toplamMiktar,
      'Döviz': hesap.doviz,
      'İşlem TL': toplamTL,
      'Kur': '',
      'Açıklama': '',
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    // Sütun genişlikleri
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 8 },
      { wch: 14 }, { wch: 12 }, { wch: 30 }
    ]
    // Sheet adı max 31 karakter
    const sheetAd = hesap.tur.replace(/[[\]*?:/\\]/g, '').substring(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetAd)
  }

  const tarih = yerelTarih(new Date())
  XLSX.writeFile(wb, `birikim-${tarih}.xlsx`)
}

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

function BirikimDuzenleFormu({ kayit, onKapat, onKayit }) {
  const hesap = HESAPLAR.find(h => h.tur === kayit.tur)
  const isDoviz = hesap && hesap.doviz !== 'TL'
  const [form, setForm] = useState({
    tarih: kayit.tarih ? yerelTarih(kayit.tarih) : '',
    miktar: String(Math.abs(kayit.miktar || 0)),
    islem_tl: String(Math.abs(kayit.islem_tl || 0)),
    kur: String(kayit.kur || ''),
    aciklama: kayit.aciklama || '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const isarMiktar = kayit.miktar >= 0 ? 1 : -1
    const isarTL = kayit.islem_tl >= 0 ? 1 : -1
    const yeniMiktar = (parseFloat(form.miktar) || 0) * isarMiktar
    const yeniIslemTL = (parseFloat(form.islem_tl) || 0) * isarTL

    // Ana kaydı güncelle
    await supabase.from('birikim_hareketler').update({
      tarih: form.tarih,
      miktar: yeniMiktar,
      islem_tl: yeniIslemTL,
      kur: form.kur ? parseFloat(form.kur) : null,
      aciklama: form.aciklama || null,
    }).eq('id', kayit.id)

    if (kayit.grup_id) {
      if (kayit.tur !== 'Birikim (TL)') {
        // Eşli Birikim(TL) kaydını güncelle
        const tlYatirim = hesap?.doviz === 'TL'
        const karsiMiktar = tlYatirim ? yeniIslemTL : -yeniIslemTL
        await supabase.from('birikim_hareketler').update({
          tarih: form.tarih,
          miktar: karsiMiktar,
          islem_tl: karsiMiktar,
        }).eq('grup_id', kayit.grup_id).neq('id', kayit.id)
      }

      // İşlemler tablosundaki eşli kaydı güncelle (varsa)
      // Birikim(TL) miktar > 0 → gider "Birikim", < 0 → gelir "Birikim"
      const yeniK = Math.abs(yeniMiktar)
      await Promise.all([
        supabase.from('giderler').update({ tarih: form.tarih, k: yeniK }).eq('grup_id', kayit.grup_id),
        supabase.from('gelirler').update({ tarih: form.tarih, k: yeniK }).eq('grup_id', kayit.grup_id),
      ])
    }

    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ {kayit.tur} — Düzenle</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {kayit.miktar >= 0 ? '▲ Giriş / Alış' : '▼ Çıkış / Satış'}
            {kayit.alt_tip ? ` · ${kayit.alt_tip}` : ''}
          </p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Miktar {hesap ? `(${hesap.doviz})` : ''}
            </label>
            <input type="number" step="any" min="0" value={form.miktar}
              onChange={e => setForm(f => ({ ...f, miktar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          {isDoviz && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">İşlem TL (₺)</label>
                <input type="number" step="0.01" min="0" value={form.islem_tl}
                  onChange={e => setForm(f => ({ ...f, islem_tl: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Kur</label>
                <input type="number" step="any" min="0" value={form.kur}
                  onChange={e => setForm(f => ({ ...f, kur: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
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

function IslemFormu({ onKapat, onKayit }) {
  const [seciliHesap, setSeciliHesap] = useState(HESAPLAR[0])
  const [islem, setIslem] = useState('giris') // 'giris' | 'cikis' | 'alis' | 'satis'
  const [miktar, setMiktar] = useState('')
  const [islemTl, setIslemTl] = useState('')
  const [kur, setKur] = useState('')
  const [tarih, setTarih] = useState(yerelTarih(new Date()))
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

    // TL yatırım hesabı mı? (Birikim TL hariç TL hesaplar)
    const tlYatirim = isTL && seciliHesap.tur !== 'Birikim (TL)'

    // Ana hesap kaydı
    let gercekMiktar = m
    let gercekTL = isTL ? m : tl
    if (islem === 'cikis' || islem === 'satis') {
      gercekMiktar = -m
      gercekTL = isTL ? -m : -tl
    }

    const grupId = crypto.randomUUID()
    const kayitlar = [{
      tarih: tarihISO,
      tur: seciliHesap.tur,
      doviz_cinsi: seciliHesap.doviz,
      alt_tip: islem === 'alis' ? 'Alış' : islem === 'satis' ? 'Satış' : islem === 'giris' ? 'Giriş' : 'Çıkış',
      miktar: gercekMiktar,
      islem_tl: gercekTL,
      kur: k,
      aciklama: aciklama || null,
      grup_id: seciliHesap.tur !== 'Birikim (TL)' && gercekTL !== 0 ? grupId : null,
    }]

    // Birikim (TL) karşı kaydı
    if (seciliHesap.tur !== 'Birikim (TL)' && gercekTL !== 0) {
      const islemAdi = islem === 'alis' ? 'alımı' : islem === 'satis' ? 'satışı' : islem === 'giris' ? 'girişi' : 'çıkışı'
      const birim = isTL ? '₺' : seciliHesap.doviz
      // TL yatırım: aynı yön (giriş=ikisi+, çıkış=ikisi-)
      // Döviz: ters yön (alış=varlık+/TL-, satış=varlık-/TL+)
      const karsiMiktar = tlYatirim ? gercekTL : -gercekTL
      kayitlar.push({
        tarih: tarihISO,
        tur: 'Birikim (TL)',
        doviz_cinsi: 'TL',
        miktar: karsiMiktar,
        islem_tl: karsiMiktar,
        alt_tip: seciliHesap.tur,
        aciklama: `${Math.abs(gercekMiktar)} ${birim} ${seciliHesap.tur} ${islemAdi}`,
        grup_id: grupId,
      })
    }

    // Yeni kayıtlar, kendi hesabındaki (tur) en büyük sira değerinden bir fazlasını alır
    // → o hesabın listesinde en üstte görünür, mevcut kayıtlar update görmez
    const turler = [...new Set(kayitlar.map(k => k.tur))]
    const maxSiralar = {}
    await Promise.all(turler.map(async (t) => {
      const { data } = await supabase.from('birikim_hareketler')
        .select('sira').eq('tur', t).order('sira', { ascending: false }).limit(1)
      maxSiralar[t] = data?.[0]?.sira ?? -1
    }))
    for (const kayit of kayitlar) {
      kayit.sira = ++maxSiralar[kayit.tur]
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
            <TarihInput value={tarih} onChange={setTarih}
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
                : `${seciliHesap.tur} ve Birikim (TL) ${islem === 'giris' ? 'ikisi de artar.' : 'ikisi de azalır.'}`
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
  const [duzenle, setDuzenle] = useState(null)
  const [hareketler, setHareketler] = useState([])
  const [filtreTur, setFiltreTur] = useState('Tümü')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliSatirId, setSeciliSatirId] = useState(null)

  // Filtre değişince seçimi sıfırla
  useEffect(() => { setSeciliSatirId(null) }, [filtreTur])

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
    const kayit = hareketler.find(r => r.id === id)
    if (kayit?.grup_id) {
      await supabase.from('birikim_hareketler').delete().eq('grup_id', kayit.grup_id)
      await supabase.from('giderler').delete().eq('grup_id', kayit.grup_id)
      await supabase.from('gelirler').delete().eq('grup_id', kayit.grup_id)
    } else {
      await supabase.from('birikim_hareketler').delete().eq('id', id)
    }
    yukle()
  }

  // Bakiyeler — tüm kayıtlardan hesaplanır
  const bakiyeler = {}
  for (const h of HESAPLAR) {
    bakiyeler[h.tur] = hareketler.filter(r => r.tur === h.tur).reduce((s, r) => s + (r.miktar || 0), 0)
  }

  // Filtrelenmiş + sıralanmış liste
  // Tümü: tarih sırası, Specific: sira sırası büyükten küçüğe (yoksa tarih) — en yeni işlem en yüksek sira değerini alır ve en üstte görünür
  const filtrelenmis = (() => {
    const base = filtreTur === 'Tümü'
      ? hareketler
      : hareketler.filter(r => r.tur === filtreTur)
    if (filtreTur === 'Tümü') return base
    return [...base].sort((a, b) => {
      if (a.sira != null && b.sira != null) return b.sira - a.sira
      if (a.sira == null && b.sira == null) return new Date(b.tarih) - new Date(a.tarih)
      return a.sira != null ? -1 : 1
    })
  })()

  const gosterilen = filtreTur === 'Tümü' ? filtrelenmis.slice(0, 200) : filtrelenmis
  const siralamaAktif = filtreTur !== 'Tümü'
  const seciliIdx = filtrelenmis.findIndex(r => r.id === seciliSatirId)

  // İki kaydın yerini değiştirir.
  // - sira değerleri zaten atanmışsa: sadece bu iki satırın sira'sını takas eder (ucuz).
  // - sira hiç atanmamışsa (null): bu hesap için ilk kullanımda, o anki görüntülenen
  //   sırayı esas alıp (takas uygulanmış haliyle) tüm listeyi normalize eder
  //   (büyükten küçüğe: en yeni işlem en yüksek değeri alır).
  //   Sonraki taşımalar artık tanımlı sira üzerinden ucuz takasla devam eder.
  const siraTakasEt = async (idxA, idxB) => {
    const liste = filtrelenmis
    const a = liste[idxA], b = liste[idxB]
    if (a.sira != null && b.sira != null) {
      await Promise.all([
        supabase.from('birikim_hareketler').update({ sira: b.sira }).eq('id', a.id),
        supabase.from('birikim_hareketler').update({ sira: a.sira }).eq('id', b.id),
      ])
    } else {
      const yeni = [...liste]
      ;[yeni[idxA], yeni[idxB]] = [yeni[idxB], yeni[idxA]]
      const n = yeni.length
      await Promise.all(
        yeni.map((r, i) => supabase.from('birikim_hareketler').update({ sira: n - 1 - i }).eq('id', r.id))
      )
    }
    yukle()
  }

  const yukariTasi = async () => {
    const idx = filtrelenmis.findIndex(r => r.id === seciliSatirId)
    if (idx <= 0) return
    await siraTakasEt(idx, idx - 1)
  }

  const asagiTasi = async () => {
    const idx = filtrelenmis.findIndex(r => r.id === seciliSatirId)
    if (idx < 0 || idx >= filtrelenmis.length - 1) return
    await siraTakasEt(idx, idx + 1)
  }

  const secilenHesap = filtreTur !== 'Tümü' ? HESAPLAR.find(h => h.tur === filtreTur) : null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-700">Birikim & Yatırım</h2>
        <div className="flex gap-2">
          <button onClick={() => exportExcel(hareketler)}
            className="flex items-center gap-1 bg-slate-100 text-slate-600 text-sm px-3 py-2 rounded-xl font-medium hover:bg-slate-200">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setEkle(true)}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
            <Plus size={15} /> İşlem
          </button>
        </div>
      </div>

      {/* Hesap özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {HESAPLAR.map(h => {
          const bakiye = bakiyeler[h.tur] || 0
          return (
            <div key={h.tur}
              onClick={() => setFiltreTur(f => f === h.tur ? 'Tümü' : h.tur)}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${h.renk} ${filtreTur === h.tur ? 'ring-2 ring-blue-400' : ''}`}>
              <p className="text-xs font-semibold opacity-60 mb-1">{h.emoji} {h.tur}</p>
              <p className="text-lg font-bold">
                {h.doviz === 'TL' ? `₺${formatPara(bakiye)}` : `${formatPara(bakiye)} ${h.doviz}`}
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

      {/* Tablo */}
      {yukleniyor ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gosterilen.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Kayıt yok. Import sayfasından Excel yükleyin veya İşlem ekleyin.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                <th className="text-left px-3 py-2.5 font-semibold w-[88px]">Tarih</th>
                <th className="text-left px-3 py-2.5 font-semibold">
                  {filtreTur === 'Tümü' ? 'Hesap' : 'İşlem'}
                </th>
                <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Açıklama</th>
                <th className="text-right px-3 py-2.5 font-semibold w-32">Miktar</th>
                <th className="w-16 pr-2">
                  {siralamaAktif && (
                    <div className="flex gap-0.5 justify-end">
                      <button onClick={yukariTasi}
                        disabled={!seciliSatirId || seciliIdx <= 0}
                        className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                        <ChevronUp size={13} />
                      </button>
                      <button onClick={asagiTasi}
                        disabled={!seciliSatirId || seciliIdx >= filtrelenmis.length - 1}
                        className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {gosterilen.map(r => {
                const hesap = HESAPLAR.find(h => h.tur === r.tur)
                const birim = hesap?.doviz || 'TL'
                const isSecili = r.id === seciliSatirId
                return (
                  <tr key={r.id}
                    onClick={() => siralamaAktif && setSeciliSatirId(id => id === r.id ? null : r.id)}
                    className={`border-b border-slate-50 last:border-0 transition-colors ${
                      siralamaAktif ? 'cursor-pointer' : ''
                    } ${isSecili ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    {/* Tarih + sol renk çizgisi */}
                    <td className={`pl-3 pr-2 py-2 whitespace-nowrap border-l-2 ${
                      isSecili ? 'text-amber-700 border-amber-400' :
                      r.miktar >= 0 ? 'text-slate-400 border-green-400' : 'text-slate-400 border-red-400'
                    }`}>
                      {formatTarih(r.tarih)}
                    </td>
                    {/* Hesap / İşlem tipi */}
                    <td className="px-3 py-2">
                      {filtreTur === 'Tümü' ? (
                        <>
                          <span className={`font-semibold ${isSecili ? 'text-amber-800' : 'text-slate-700'}`}>
                            {hesap?.emoji} {r.tur.replace('Yatırım ', '')}
                          </span>
                          {r.alt_tip && (
                            <span className="ml-1.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              {r.alt_tip}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className={`font-semibold ${
                            isSecili ? 'text-amber-800' :
                            r.miktar >= 0 ? 'text-green-700' : 'text-red-600'
                          }`}>
                            {r.alt_tip || '—'}
                          </span>
                          {r.aciklama && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-[100px] sm:hidden mt-0.5">
                              {r.aciklama}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    {/* Açıklama — sadece geniş ekranda */}
                    <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate hidden sm:table-cell">
                      {r.aciklama || <span className="text-slate-300">—</span>}
                    </td>
                    {/* Miktar */}
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${
                        isSecili ? 'text-amber-700' :
                        r.miktar >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {r.miktar >= 0 ? '+' : ''}{formatPara(r.miktar)} {birim !== 'TL' ? birim : '₺'}
                      </span>
                      {birim !== 'TL' && r.islem_tl != null && r.islem_tl !== 0 && (
                        <span className="block text-[10px] text-slate-400">
                          ₺{formatPara(Math.abs(r.islem_tl))}
                        </span>
                      )}
                    </td>
                    {/* Aksiyonlar */}
                    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <button onClick={() => setDuzenle(r)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => sil(r.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Footer: seçili hesap bakiyesi */}
            {secilenHesap && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan="3" className="px-3 py-2 text-slate-400">
                    {filtrelenmis.length} kayıt
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    <span className={bakiyeler[filtreTur] >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {bakiyeler[filtreTur] >= 0 ? '+' : ''}{formatPara(bakiyeler[filtreTur])}{' '}
                      {secilenHesap.doviz !== 'TL' ? secilenHesap.doviz : '₺'}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {filtreTur === 'Tümü' && filtrelenmis.length > 200 && (
        <p className="text-center text-xs text-slate-400 py-2">İlk 200 kayıt gösteriliyor. Hesap filtresi kullanın.</p>
      )}

      {ekle && <IslemFormu onKapat={() => setEkle(false)} onKayit={yukle} />}
      {duzenle && <BirikimDuzenleFormu kayit={duzenle} onKapat={() => setDuzenle(null)} onKayit={yukle} />}
    </div>
  )
}
