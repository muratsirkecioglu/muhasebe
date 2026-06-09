import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { formatPara, formatTarih, yerelTarih, GIDER_KATEGORILER } from '../db'
import TarihInput from '../components/TarihInput'
import { Plus, Trash2, CreditCard, User, Scissors, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react'

const DOVIZLER = ['TL', 'USD', 'EUR', 'GBP', 'ALT', 'GMS']
const SEMBOL = { TL: '₺', USD: '$', EUR: '€', GBP: '£', ALT: 'gr', GMS: 'gr' }

// borc_kalemler: sira, hesap_id bazında scoped tutuluyor (kk hesaplarda dönem
// filtreli, kişi hesaplarda tüm kayıtlar tek listede gösteriliyor — bu yüzden
// havuz dönem değil, hesabın TAMAMI üzerinden tutulmalı).
// Verilen hesap için o anki en yüksek sira değerini getirir (kayıt yoksa -1).
// Yeni kayıtlar bu değer + 1, +2, … alır; böylece son işlem her zaman o
// hesabın en yüksek sira'sına sahip olur ve dönemler arası çakışma olmaz.
async function borcKalemMaxSira(hesapId) {
  const { data } = await supabase.from('borc_kalemler')
    .select('sira').eq('hesap_id', hesapId)
    .order('sira', { ascending: false }).limit(1)
  return data?.[0]?.sira ?? -1
}

// Kişi hesapları artık hesap_hareketler'de tutuluyor (yeni mimari) — aynı
// "hesap başına en yüksek sira" deseni, sadece tablo farklı.
async function hesapHareketMaxSira(hesapId) {
  const { data } = await supabase.from('hesap_hareketler')
    .select('sira').eq('hesap_id', hesapId)
    .order('sira', { ascending: false }).limit(1)
  return data?.[0]?.sira ?? -1
}

// Islemler ekranı, giderler+gelirler'i dönem bazında BİRLEŞİK liste olarak gösterip
// sira'yı bu birleşik liste üzerinden yönetiyor. Buradan giderler tablosuna toplu kayıt
// eklerken de aynı sira havuzunu kullanmamız gerekir (yoksa iki tablodan çakışan değerler
// çıkabilir). Verilen dönemlerin her biri için iki tabloda görülen en yüksek sira'yı bulur.
// KK ekstre kesildiğinde Banka hesabından çıkışı temsil eden satırlar artık eski
// 'giderler' tablosu yerine doğrudan hesap_hareketler'e (Banka hesabına, tur='gider')
// yazılıyor — Islemler/Dashboard/Hesap zaten yalnızca hesap_hareketler okuduğundan,
// K bakiyesinin bu ödemelerle doğru düşmesi için bu satırların orada görünmesi gerekiyor.
let _knIdCache = null
async function knIdleriGetir() {
  if (_knIdCache) return _knIdCache
  const { data } = await supabase.from('hesaplar').select('id, ad').in('ad', ['Banka', 'Nakit'])
  _knIdCache = {
    banka: data?.find(h => h.ad === 'Banka')?.id ?? null,
    nakit: data?.find(h => h.ad === 'Nakit')?.id ?? null,
  }
  return _knIdCache
}

// Islemler.jsx'teki islemSiraGetir ile aynı mantık: Banka+Nakit BİRLEŞİK havuzunda
// dönem bazlı en yüksek sira (Islemler ekranında bu satırlar o ortak listede görünür).
async function knMaxSiralar(donemler, ids) {
  const benzersiz = [...new Set(donemler)]
  const sonuc = {}
  await Promise.all(benzersiz.map(async (donem) => {
    const { data } = await supabase.from('hesap_hareketler')
      .select('sira')
      .in('hesap_id', [ids.banka, ids.nakit])
      .eq('donem', donem)
      .order('sira', { ascending: false, nullsFirst: false })
      .limit(1)
    sonuc[donem] = data?.[0]?.sira ?? -1
  }))
  return sonuc
}

// --- Hesap Ekleme Formu ---
function HesapFormu({ onKapat, onKayit }) {
  const [form, setForm] = useState({ ad: '', tip: 'kisi', doviz_cinsi: 'TL', ekstre_gun: '', aciklama: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    if (form.tip === 'kisi') {
      // Kişi hesapları artık hesaplar tablosunda (tip='borc'), Birikim (TL)'nin
      // altında — mevcut tohum verilerle aynı desen (bkz. supabase-hesap-mimarisi.sql)
      const { data: kok } = await supabase.from('hesaplar').select('id').eq('ad', 'Birikim (TL)').single()
      const { data: kardesler } = await supabase.from('hesaplar').select('sira').eq('ust_hesap_id', kok?.id ?? -1)
        .order('sira', { ascending: false }).limit(1)
      const sira = (kardesler?.[0]?.sira ?? 0) + 1
      await supabase.from('hesaplar').insert({
        ad: form.ad.trim(),
        ust_hesap_id: kok?.id ?? null,
        tip: 'borc',
        doviz_cinsi: form.doviz_cinsi,
        aktif: true,
        sira,
        aciklama: form.aciklama || null,
      })
    } else {
      await supabase.from('borc_hesaplar').insert({
        ad: form.ad.trim(),
        tip: form.tip,
        doviz_cinsi: form.doviz_cinsi,
        ekstre_gun: form.tip === 'kk' && form.ekstre_gun ? parseInt(form.ekstre_gun) : null,
        aciklama: form.aciklama || null,
      })
    }
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">➕ Yeni Hesap</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Tipi</label>
            <div className="flex gap-2">
              {[['kisi', '👤 Kişi'], ['kk', '💳 Kredi Kartı']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tip: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tip === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              placeholder={form.tip === 'kk' ? 'ör: A-BANK(KK)' : 'ör: Ahmet Bey'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Döviz Cinsi</label>
            <select value={form.doviz_cinsi} onChange={e => setForm(f => ({ ...f, doviz_cinsi: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {DOVIZLER.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {form.tip === 'kk' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ekstre Günü (ayın kaçı)</label>
              <input type="number" min="1" max="31" value={form.ekstre_gun}
                onChange={e => setForm(f => ({ ...f, ekstre_gun: e.target.value }))}
                placeholder="ör: 15"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama (isteğe bağlı)</label>
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

// --- Hesap Düzenleme Formu ---
function HesapDuzenleFormu({ hesap, onKapat, onKayit }) {
  const [form, setForm] = useState({
    ad: hesap.ad,
    doviz_cinsi: hesap.doviz_cinsi,
    ekstre_gun: hesap.ekstre_gun || '',
    aciklama: hesap.aciklama || '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    if (hesap.tip === 'kisi') {
      // Kişi hesapları artık hesaplar tablosunda (tip='borc') tutuluyor
      await supabase.from('hesaplar').update({
        ad: form.ad.trim(),
        doviz_cinsi: form.doviz_cinsi,
        aciklama: form.aciklama || null,
      }).eq('id', hesap.id)
    } else {
      await supabase.from('borc_hesaplar').update({
        ad: form.ad.trim(),
        tip: hesap.tip,
        doviz_cinsi: form.doviz_cinsi,
        ekstre_gun: form.ekstre_gun ? parseInt(form.ekstre_gun) : null,
        aciklama: form.aciklama || null,
      }).eq('id', hesap.id)
    }
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Hesabı Düzenle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Tipi</label>
            <div className={`px-3 py-2 rounded-xl text-sm font-medium border ${
              hesap.tip === 'kisi' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              {hesap.tip === 'kisi' ? '👤 Kişi' : '💳 Kredi Kartı'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Hesap tipi sonradan değiştirilemez.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap Adı</label>
            <input type="text" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Döviz Cinsi</label>
            <select value={form.doviz_cinsi} onChange={e => setForm(f => ({ ...f, doviz_cinsi: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {DOVIZLER.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {hesap.tip === 'kk' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ekstre Günü (ayın kaçı)</label>
              <input type="number" min="1" max="31" value={form.ekstre_gun}
                onChange={e => setForm(f => ({ ...f, ekstre_gun: e.target.value }))}
                placeholder="ör: 15"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
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

// --- Kalem Düzenleme Formu ---
function KalemDuzenleFormu({ kalem, doviz_cinsi, tip, onKapat, onKayit }) {
  const sembol = SEMBOL[doviz_cinsi] || doviz_cinsi
  const [form, setForm] = useState({
    tarih: kalem.tarih ? yerelTarih(kalem.tarih) : yerelTarih(new Date()),
    tutar: Math.abs(kalem.tutar),
    aciklama: kalem.aciklama || '',
  })
  const isPositive = kalem.tutar >= 0
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const yeniTutar = parseFloat(form.tutar) || 0
    if (tip === 'kisi') {
      // kalem.tutar burada eski-mimari görünüm için ters çevrilmiş bir shim
      // değeri (bkz. yukleDetay) — hesap_hareketler'e yazarken AŞAMA 6
      // migrasyonuyla tutarlı olacak şekilde tekrar ters çevrilir.
      const dbTutar = isPositive ? -yeniTutar : yeniTutar
      const guncelleme = { tarih: form.tarih, tutar: dbTutar, aciklama: form.aciklama || null }
      const islemler = [supabase.from('hesap_hareketler').update(guncelleme).eq('id', kalem.id)]
      if (kalem.grup_id) {
        // Çift kayıtlı işlem: karşı bacağı (birikim hesabı) simetrik tutarla güncelle
        islemler.push(
          supabase.from('hesap_hareketler')
            .update({ tarih: form.tarih, tutar: -dbTutar, aciklama: form.aciklama || null })
            .eq('grup_id', kalem.grup_id).neq('id', kalem.id)
        )
      }
      await Promise.all(islemler)
    } else {
      await supabase.from('borc_kalemler').update({
        tarih: form.tarih,
        tutar: isPositive ? yeniTutar : -yeniTutar,
        aciklama: form.aciklama || null,
      }).eq('id', kalem.id)
    }
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Kalemi Düzenle</h3>
          <p className="text-xs text-slate-400 mt-0.5">{isPositive ? '🔴 Borç' : '🟢 Ödeme'}</p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar ({sembol})</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
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

// --- Taksit Grubu Düzenleme Formu ---
function TaksitGrubuDuzenleFormu({ grupId, hesapId, doviz_cinsi, onKapat, onKayit }) {
  const sembol = SEMBOL[doviz_cinsi] || doviz_cinsi
  const [taksitler, setTaksitler] = useState([])
  const [toplamTutar, setToplamTutar] = useState('')
  const [islemTarihi, setIslemTarihi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    supabase.from('borc_kalemler')
      .select('*').eq('grup_id', grupId).order('taksit_no', { ascending: true })
      .then(({ data }) => {
        const rows = (data || []).map(r => ({
          ...r,
          _tutar: String(Math.abs(r.tutar || 0)),
          _tarih: r.tarih ? yerelTarih(r.tarih) : '',
        }))
        setTaksitler(rows)
        const top = rows.reduce((s, r) => s + (parseFloat(r._tutar) || 0), 0)
        setToplamTutar(String(Math.round(top * 100) / 100))
        // İlk taksit tarihi = işlem tarihi referansı
        setIslemTarihi(rows[0]?._tarih || yerelTarih(new Date()))
        setYukleniyor(false)
      })
  }, [grupId])

  // Ödenmemiş taksitleri yeniden eşit dağıt
  const dagit = (rows, yeniToplam) => {
    const odenenler = rows.filter(r => r.odendi)
    const odenenenToplam = odenenler.reduce((s, r) => s + (parseFloat(r._tutar) || 0), 0)
    const kalan = (parseFloat(yeniToplam) || 0) - odenenenToplam
    const odenmemisIdx = rows.map((r, i) => r.odendi ? null : i).filter(i => i !== null)
    if (odenmemisIdx.length === 0) return rows
    const esit = Math.round(kalan / odenmemisIdx.length * 100) / 100
    const son = Math.round((kalan - esit * (odenmemisIdx.length - 1)) * 100) / 100
    const yeni = [...rows]
    odenmemisIdx.forEach((idx, j) => {
      yeni[idx] = { ...yeni[idx], _tutar: String(j === odenmemisIdx.length - 1 ? son : esit) }
    })
    return yeni
  }

  // Toplam tutar değişince ödenmemişleri dağıt
  const toplamDegisti = (val) => {
    setToplamTutar(val)
    setTaksitler(t => dagit(t, val))
  }

  // İşlem tarihi değişince tüm taksit tarihlerini kaydır
  const islemTarihiDegisti = (val) => {
    setIslemTarihi(val)
    if (!val) return
    const baslangic = new Date(val)
    if (isNaN(baslangic)) return
    setTaksitler(t => t.map((r, i) => {
      const t2 = new Date(baslangic)
      t2.setMonth(t2.getMonth() + i)
      return { ...r, _tarih: yerelTarih(t2) }
    }))
  }

  // Taksit sayısı değişince satır ekle/çıkar ve dağıt
  const sayiDegisti = (val) => {
    const yeniSayi = Math.max(1, parseInt(val) || 1)
    setTaksitler(mevcut => {
      let rows = [...mevcut]
      if (yeniSayi > rows.length) {
        // Yeni satır ekle — son tarihe +1 ay
        const sonTarih = rows.length > 0 ? new Date(rows[rows.length - 1]._tarih) : new Date()
        for (let i = rows.length; i < yeniSayi; i++) {
          const t = new Date(sonTarih)
          t.setMonth(t.getMonth() + (i - rows.length + 1))
          rows.push({
            id: `new_${i}`, _tutar: '0', _tarih: yerelTarih(t),
            odendi: false, tur: 'taksit', hesap_id: hesapId, grup_id: grupId,
            taksit_no: i + 1, taksit_toplam: yeniSayi,
            kategori: mevcut[0]?.kategori || null, aciklama: mevcut[0]?.aciklama?.replace(/\(\d+\/\d+\)/, '') || null,
            donem: null,
          })
        }
      } else {
        rows = rows.slice(0, yeniSayi)
      }
      return dagit(rows, toplamTutar)
    })
  }

  const guncelle = (idx, alan, deger) => {
    setTaksitler(t => { const y = [...t]; y[idx] = { ...y[idx], [alan]: deger }; return y })
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    // Eski tüm taksitleri sil
    await supabase.from('borc_kalemler').delete().eq('grup_id', grupId)
    // Yenilerini oluştur
    const yeniKalemler = taksitler.map((r, i) => {
      const tarihStr = r._tarih
      const d = new Date(tarihStr)
      const donem = isNaN(d) ? null : d.getFullYear() * 100 + d.getMonth() + 1
      return {
        hesap_id: hesapId,
        grup_id: grupId,
        tarih: tarihStr,
        donem,
        tutar: parseFloat(r._tutar) || 0,
        odendi: r.odendi || false,
        tur: 'taksit',
        taksit_no: i + 1,
        taksit_toplam: taksitler.length,
        kategori: r.kategori || null,
        aciklama: r.aciklama
          ? r.aciklama.replace(/\(\d+\/\d+\)/, `(${i + 1}/${taksitler.length})`)
          : `Taksit (${i + 1}/${taksitler.length})`,
      }
    })
    let sonSira = await borcKalemMaxSira(hesapId)
    for (const kalem of yeniKalemler) kalem.sira = ++sonSira
    await supabase.from('borc_kalemler').insert(yeniKalemler)
    onKayit(); onKapat()
  }

  const toplamHesap = taksitler.reduce((s, r) => s + (parseFloat(r._tutar) || 0), 0)
  const fark = Math.abs(toplamHesap - (parseFloat(toplamTutar) || 0))
  const eslesti = fark < 0.01

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">✏️ Taksitleri Düzenle</h3>
        </div>

        {yukleniyor ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={kaydet} className="flex flex-col flex-1 overflow-hidden">
            {/* Üst alanlar */}
            <div className="px-5 pt-4 pb-3 space-y-3 flex-shrink-0 border-b border-slate-100">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">İşlem Tarihi (1. taksit)</label>
                <TarihInput value={islemTarihi} onChange={islemTarihiDegisti}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <p className="text-xs text-slate-400 mt-1">Değişince tüm taksit tarihleri aylık kaydırılır</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-500 block mb-1">Toplam Tutar ({sembol})</label>
                  <input type="number" step="0.01" min="0" value={toplamTutar}
                    onChange={e => toplamDegisti(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="w-24">
                  <label className="text-xs font-medium text-slate-500 block mb-1">Taksit Sayısı</label>
                  <input type="number" min="1" max="60" value={taksitler.length}
                    onChange={e => sayiDegisti(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {taksitler.map((r, i) => (
                <div key={r.id || i} className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${r.odendi ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <button type="button" onClick={() => guncelle(i, 'odendi', !r.odendi)}
                    className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${r.odendi ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                    {r.odendi && <span className="text-xs leading-none">✓</span>}
                  </button>
                  <span className="text-xs text-slate-500 w-8 flex-shrink-0 text-center font-medium">{i + 1}</span>
                  <TarihInput value={r._tarih} onChange={v => guncelle(i, '_tarih', v)}
                    className="w-24 flex-shrink-0 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                  <input type="number" step="0.01" min="0" value={r._tutar}
                    onChange={e => guncelle(i, '_tutar', e.target.value)}
                    className={`flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${r.odendi ? 'text-slate-400' : ''}`} />
                  <span className="text-xs text-slate-400 flex-shrink-0">{sembol}</span>
                </div>
              ))}
            </div>

            {!eslesti && (
              <p className="text-xs text-center text-red-500 pb-2">
                Toplam {sembol}{formatPara(toplamHesap)} / Hedef {sembol}{formatPara(parseFloat(toplamTutar) || 0)}
              </p>
            )}

            <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
              <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// --- Kişi: Verdim / Aldım Formu ---
// verdim → kaynak hesaptan -tutar (para çıkar), borc hesabına +tutar (Alacak oluşur)
// aldin  → kaynak hesaba  +tutar (para girer),  borc hesabına -tutar (Alacak kapanır)
function AlOdeFormu({ hesap, onKapat, onKayit }) {
  const sembol = SEMBOL[hesap.doviz_cinsi] || hesap.doviz_cinsi
  const [form, setForm] = useState({ tarih: yerelTarih(new Date()), tur: 'verdim', tutar: '', aciklama: '' })
  const [kaynakHesapId, setKaynakHesapId] = useState('')
  const [kaynakHesaplar, setKaynakHesaplar] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    supabase.from('hesaplar')
      .select('id, ad')
      .eq('doviz_cinsi', hesap.doviz_cinsi)
      .eq('aktif', true)
      .neq('tip', 'borc')
      .neq('id', hesap.id)
      .order('sira')
      .then(({ data }) => {
        setKaynakHesaplar(data || [])
        if (data?.length > 0) setKaynakHesapId(String(data[0].id))
      })
  }, [hesap.doviz_cinsi, hesap.id])

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const tutar = parseFloat(form.tutar) || 0
    const d = new Date(form.tarih)
    const donem = d.getFullYear() * 100 + d.getMonth() + 1
    const isVerdim = form.tur === 'verdim'
    const kaynakId = parseInt(kaynakHesapId)

    const [borcSira, kaynakSira] = await Promise.all([
      hesapHareketMaxSira(hesap.id).then(s => s + 1),
      hesapHareketMaxSira(kaynakId).then(s => s + 1),
    ])
    const kategori = isVerdim ? 'Borç Verildi' : 'Borç Tahsil'
    const grupId = crypto.randomUUID()
    await supabase.from('hesap_hareketler').insert([
      {
        hesap_id: hesap.id,
        karsi_hesap_id: kaynakId,
        grup_id: grupId, tarih: form.tarih, donem,
        tutar: isVerdim ? tutar : -tutar,   // verdim → +tutar = Alacak; aldım → -tutar = kapanır
        tur: 'transfer', kategori,
        aciklama: form.aciklama || null,
        sira: borcSira,
      },
      {
        hesap_id: kaynakId,
        karsi_hesap_id: hesap.id,
        grup_id: grupId, tarih: form.tarih, donem,
        tutar: isVerdim ? -tutar : tutar,   // verdim → -tutar = çıkış; aldım → +tutar = giriş
        tur: 'transfer', kategori,
        aciklama: form.aciklama || null,
        sira: kaynakSira,
      },
    ])
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">👤 {hesap.ad}</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">İşlem</label>
            <div className="flex gap-2">
              {[
                ['verdim', '↑ Verdim',  'bg-amber-50 border-amber-300 text-amber-700'],
                ['aldin',  '↓ Aldım',   'bg-green-50 border-green-300 text-green-600'],
              ].map(([val, label, aktifCls]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tur: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.tur === val ? aktifCls : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {form.tur === 'verdim'
                ? '🟡 Hesabından çıkar → kişi sana borçlanır (Alacak)'
                : '🟢 Hesabına girer → kişinin borcu kapanır'}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              {form.tur === 'verdim' ? 'Kaynak hesap' : 'Hedef hesap'}
            </label>
            {kaynakHesaplar.length === 0 ? (
              <p className="text-xs text-red-400 bg-red-50 rounded-xl px-3 py-2">
                {hesap.doviz_cinsi} cinsinden takip edilen hesap yok.
              </p>
            ) : (
              <select value={kaynakHesapId} onChange={e => setKaynakHesapId(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {kaynakHesaplar.map(h => (
                  <option key={h.id} value={h.id}>{h.ad}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar ({sembol})</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor || !kaynakHesapId}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- KK: Harcama Ekleme Formu ---
// --- KK: Bekleyen Harcama Düzenleme ---
function HarcamaDuzenleFormu({ harcama, onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: harcama.tarih ? yerelTarih(harcama.tarih) : '',
    tutar: String(harcama.tutar || ''),
    kategori: harcama.kategori || GIDER_KATEGORILER[0],
    aciklama: harcama.aciklama || '',
    harcama_tipi: harcama.harcama_tipi || 'pesin',
    taksit_sayisi: String(harcama.taksit_sayisi || 2),
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('borc_harcamalar').update({
      tarih: form.tarih,
      tutar: parseFloat(form.tutar) || 0,
      kategori: form.kategori || null,
      aciklama: form.aciklama || null,
      harcama_tipi: form.harcama_tipi,
      taksit_sayisi: form.harcama_tipi === 'taksitli' ? parseInt(form.taksit_sayisi) || 2 : 1,
    }).eq('id', harcama.id)
    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ Harcamayı Düzenle</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ekstre kesilmemiş harcama</p>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Tipi</label>
            <div className="flex gap-2">
              {[['pesin', '💵 Peşin / Tek Çekim'], ['taksitli', '📅 Taksitli']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, harcama_tipi: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.harcama_tipi === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {GIDER_KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {form.harcama_tipi === 'taksitli' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Taksit Sayısı</label>
              <input type="number" min="2" max="60" value={form.taksit_sayisi}
                onChange={e => setForm(f => ({ ...f, taksit_sayisi: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function taksitDagit(tutar, sayi) {
  const n = parseInt(sayi) || 2
  const t = parseFloat(tutar) || 0
  if (n <= 0 || t <= 0) return Array(n).fill('0.00')
  const esit = Math.round(t / n * 100) / 100
  const son = Math.round((t - esit * (n - 1)) * 100) / 100
  return Array.from({ length: n }, (_, i) => String(i === n - 1 ? son : esit))
}

function HarcamaFormu({ hesap, onKapat, onKayit }) {
  const bugun = yerelTarih(new Date())
  const [form, setForm] = useState({
    tarih: bugun,
    tutar: '',
    kategori: GIDER_KATEGORILER[0],
    aciklama: '',
    harcama_tipi: 'taksitli',
    taksit_sayisi: '2',
  })
  const [taksitler, setTaksitler] = useState(['', ''])
  const [odendi, setOdendi] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Tutar veya taksit sayısı değişince eşit dağıt
  useEffect(() => {
    if (form.harcama_tipi !== 'taksitli') return
    setTaksitler(taksitDagit(form.tutar, form.taksit_sayisi))
  }, [form.tutar, form.taksit_sayisi, form.harcama_tipi])

  // Taksit sayısı veya tarih değişince ödendi durumunu hesapla
  useEffect(() => {
    if (form.harcama_tipi !== 'taksitli') return
    const n = parseInt(form.taksit_sayisi) || 2
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const baslangic = new Date(form.tarih || bugun)
    const ekstreGun = hesap?.ekstre_gun

    setOdendi(Array.from({ length: n }, (_, i) => {
      const taksitAy = new Date(baslangic.getFullYear(), baslangic.getMonth() + i, 1)
      // Ekstre kesilme tarihi: o ayın ekstre_gun'u (yoksa ayın son günü)
      const ekstreTarihi = ekstreGun
        ? new Date(taksitAy.getFullYear(), taksitAy.getMonth(), ekstreGun)
        : new Date(taksitAy.getFullYear(), taksitAy.getMonth() + 1, 0)
      return ekstreTarihi < today
    }))
  }, [form.taksit_sayisi, form.tarih, form.harcama_tipi, hesap?.ekstre_gun])

  const taksitGuncelle = (idx, deger) => {
    setTaksitler(t => { const y = [...t]; y[idx] = deger; return y })
  }
  const odendiToggle = (idx) => {
    setOdendi(o => { const y = [...o]; y[idx] = !y[idx]; return y })
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)

    if (form.harcama_tipi === 'taksitli') {
      // Taksitli: doğrudan borc_kalemler'e aylık kayıt oluştur
      const grupId = crypto.randomUUID()
      const baslangic = new Date(form.tarih)
      const ekstreGun = hesap?.ekstre_gun
      const kalemler = taksitler.map((miktar, i) => {
        const taksitAy = new Date(baslangic.getFullYear(), baslangic.getMonth() + i, ekstreGun || 1)
        const donem = taksitAy.getFullYear() * 100 + taksitAy.getMonth() + 1
        return {
          hesap_id: hesap.id,
          tarih: yerelTarih(taksitAy),
          donem,
          tutar: parseFloat(miktar) || 0,
          kategori: form.kategori || null,
          aciklama: `${form.aciklama || hesap.ad} (${i + 1}/${taksitler.length})`,
          tur: 'taksit',
          taksit_no: i + 1,
          taksit_toplam: taksitler.length,
          grup_id: grupId,
          odendi: odendi[i] || false,
        }
      })
      let sonSira = await borcKalemMaxSira(hesap.id)
      for (const kalem of kalemler) kalem.sira = ++sonSira
      await supabase.from('borc_kalemler').insert(kalemler)
    } else {
      // Peşin: bekleyen listesine ekle, ekstre kesilince işlenir
      await supabase.from('borc_harcamalar').insert({
        hesap_id: hesap.id,
        tarih: form.tarih,
        tutar: parseFloat(form.tutar) || 0,
        kategori: form.kategori || null,
        aciklama: form.aciklama || null,
        harcama_tipi: 'pesin',
        taksit_sayisi: 1,
        ekstre_kesildi: false,
      })
    }

    onKayit(); onKapat()
  }

  const toplamTaksit = taksitler.reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const hedefTutar = parseFloat(form.tutar) || 0
  const fark = Math.abs(toplamTaksit - hedefTutar)
  const tutarEslesti = fark < 0.01

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">📅 Taksitli Harcama — {hesap.ad}</h3>
        </div>
        <form onSubmit={kaydet} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Tarihi</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Toplam Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.tutar}
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Harcama Kategorisi</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {GIDER_KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {form.harcama_tipi === 'taksitli' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Taksit Sayısı</label>
                <input type="number" min="2" max="60" value={form.taksit_sayisi}
                  onChange={e => setForm(f => ({ ...f, taksit_sayisi: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
              </div>

              {taksitler.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500">Taksit Miktarları (₺)</label>
                    <span className={`text-xs font-semibold ${tutarEslesti ? 'text-green-600' : 'text-red-500'}`}>
                      {formatPara(toplamTaksit)} / {formatPara(hedefTutar)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {taksitler.map((miktar, i) => {
                      const base = new Date(form.tarih || bugun)
                      const t = new Date(base.getFullYear(), base.getMonth() + i, 1)
                      const ay = t.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
                      const isOdendi = odendi[i] || false
                      return (
                        <div key={i} className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${isOdendi ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                          <button type="button" onClick={() => odendiToggle(i)}
                            className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isOdendi ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                            {isOdendi && <span className="text-xs leading-none">✓</span>}
                          </button>
                          <span className="text-xs text-slate-500 w-12 flex-shrink-0">{i + 1}. <span className="text-slate-400">{ay}</span></span>
                          <input
                            type="number" step="0.01" min="0" value={miktar}
                            onChange={e => taksitGuncelle(i, e.target.value)}
                            className={`flex-1 min-w-0 text-sm bg-transparent focus:outline-none text-right ${isOdendi ? 'text-green-700 line-through' : ''}`}
                          />
                          <span className="text-xs text-slate-400">₺</span>
                        </div>
                      )
                    })}
                  </div>
                  {!tutarEslesti && hedefTutar > 0 && (
                    <p className="text-xs text-red-500 mt-1.5 text-center">
                      Toplam ₺{formatPara(fark)} {toplamTaksit > hedefTutar ? 'fazla' : 'eksik'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- KK: Ekstre Kes Modal ---
function EkstreFormu({ hesap, harcamalar, donemHareketler, seciliDonem, onKapat, onKayit }) {
  const bekleyenPesin = harcamalar.filter(h => !h.ekstre_kesildi && h.harcama_tipi === 'pesin')
  const donemOdenmemis = donemHareketler.filter(r => !r.odendi && r.tutar > 0)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const toplamTutar = [...bekleyenPesin, ...donemOdenmemis].reduce((s, r) => s + (r.tutar || 0), 0)
  const hicKayitYok = bekleyenPesin.length === 0 && donemOdenmemis.length === 0

  const kesEkstre = async () => {
    if (hicKayitYok) return
    setKaydediliyor(true)
    const bugun = yerelTarih(new Date())
    const donem = seciliDonem || (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()

    // 1. Bekleyen peşin harcamaları borc_kalemler'e bireysel kayıt olarak ekle + kapat
    const pesinKalemler = []
    if (bekleyenPesin.length > 0) {
      let sonSira = await borcKalemMaxSira(hesap.id)
      const yeniKalemler = bekleyenPesin.map(h => ({
        hesap_id: hesap.id,
        tarih: bugun,
        donem,
        tutar: h.tutar,
        kategori: h.kategori || null,
        aciklama: h.aciklama || 'Ekstre',
        tur: 'ekstre',
        odendi: true,
        grup_id: crypto.randomUUID(),
        sira: ++sonSira,
      }))
      await supabase.from('borc_kalemler').insert(yeniKalemler)
      await supabase.from('borc_harcamalar')
        .update({ ekstre_kesildi: true })
        .in('id', bekleyenPesin.map(h => h.id))
      pesinKalemler.push(...yeniKalemler)
    }

    // 2. Dönemin ödenmemiş taksitlerini ödendi olarak işaretle
    if (donemOdenmemis.length > 0) {
      await supabase.from('borc_kalemler')
        .update({ odendi: true })
        .in('id', donemOdenmemis.map(r => r.id))
    }

    // 3. Banka hesabına gider kayıtları ekle
    //    - Peşin: kategori bazında topla → 1 kayıt / kategori, açıklama "KK Harcama"
    //    - Taksitli: her biri kendi kategori + açıklamasıyla ayrı kayıt
    const knIds = await knIdleriGetir()
    const tumDonemler = [...new Set([donem, ...donemOdenmemis.map(r => r.donem).filter(Boolean)])]
    const maxSiralar = await knMaxSiralar(tumDonemler, knIds)

    const bankaGiderler = []

    // Peşin → kategori bazında grupla
    const pesinGrubu = {}
    pesinKalemler.forEach(k => {
      const kat = k.kategori || 'Diğer'
      pesinGrubu[kat] = (pesinGrubu[kat] || 0) + (k.tutar || 0)
    })
    Object.entries(pesinGrubu).forEach(([kat, toplam]) => {
      bankaGiderler.push({
        hesap_id: knIds.banka,
        karsi_hesap_id: null,
        grup_id: null,
        tarih: bugun,
        donem,
        tutar: -toplam,
        tur: 'gider',
        kategori: kat,
        aciklama: 'KK Harcama',
        sira: ++maxSiralar[donem],
      })
    })

    // Taksitli → her biri ayrı kayıt, kendi açıklaması ve kategorisiyle
    donemOdenmemis.forEach(r => {
      bankaGiderler.push({
        hesap_id: knIds.banka,
        karsi_hesap_id: null,
        grup_id: null,
        tarih: r.tarih,
        donem: r.donem,
        tutar: -(r.tutar || 0),
        tur: 'gider',
        kategori: r.kategori || 'Diğer',
        aciklama: r.aciklama || hesap.ad,
        sira: ++maxSiralar[r.donem],
      })
    })

    if (bankaGiderler.length > 0) {
      await supabase.from('hesap_hareketler').insert(bankaGiderler)
    }

    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✂️ Ekstre Kes — {hesap.ad}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {donemOdenmemis.length} taksit + {bekleyenPesin.length} bekleyen · ₺{formatPara(toplamTutar)} toplam
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {hicKayitYok ? (
            <p className="text-center text-slate-400 text-sm py-6">Bu dönemde işlenecek kayıt yok.</p>
          ) : (
            <>
              {donemOdenmemis.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">📅 Bu Dönemin Taksitleri</p>
                  <div className="space-y-2">
                    {donemOdenmemis.map(r => (
                      <div key={r.id} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{r.aciklama || '—'}</p>
                          {r.kategori && <p className="text-xs text-slate-400">{r.kategori}</p>}
                        </div>
                        <p className="text-sm font-bold text-purple-700 flex-shrink-0">₺{formatPara(r.tutar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bekleyenPesin.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">⏳ Bekleyen Peşin Harcamalar</p>
                  <div className="space-y-2">
                    {bekleyenPesin.map(h => (
                      <div key={h.id} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{h.aciklama || '—'}</p>
                          {h.kategori && <p className="text-xs text-slate-400">{h.kategori}</p>}
                        </div>
                        <p className="text-sm font-bold text-orange-600 flex-shrink-0">₺{formatPara(h.tutar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <p className="text-sm text-slate-600">Toplam Gider</p>
                <p className="text-base font-bold text-slate-800">₺{formatPara(toplamTutar)}</p>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onKapat} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
          <button onClick={kesEkstre} disabled={kaydediliyor || hicKayitYok}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {kaydediliyor ? 'Kesiliyor...' : <><Scissors size={14} /> Ekstreyi Kes</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Ana Sayfa ---
export default function BorcAlacak() {
  const [sekme, setSekme] = useState('aktif') // 'aktif' | 'gecmis'
  const [hesaplar, setHesaplar] = useState([])
  const [gecmisHesaplar, setGecmisHesaplar] = useState([])
  const [gecmisBakiyeler, setGecmisBakiyeler] = useState({}) // hesap_id → bakiye
  const [secili, setSecili] = useState(null)
  const [hareketler, setHareketler] = useState([])
  const [harcamalar, setHarcamalar] = useState([])
  const [aktifBakiyeler, setAktifBakiyeler] = useState({}) // hesap_id → { bakiye, guncel, toplam }
  const [form, setForm] = useState(null) // null | 'hesap' | 'duzenle-hesap' | 'alode' | 'harcama' | 'ekstre'
  const [duzenleKalem, setDuzenleKalem] = useState(null)
  const [duzenleHarcama, setDuzenleHarcama] = useState(null)
  const [yeniSatir, setYeniSatir] = useState(null) // peşin satır inline ekleme
  const [seciliSatirId, setSeciliSatirId] = useState(null) // peşin harcama sıralama
  const [seciliHareketId, setSeciliHareketId] = useState(null) // hareket sıralama
  const [yukleniyor, setYukleniyor] = useState(true)

  // Kişi hesapları artık `hesaplar` (tip='borc') tablosunda — borc_hesaplar-şekilli
  // nesnelere eşlenir ki mevcut JSX değişmeden çalışsın (shim deseni; bkz. Birikim.jsx)
  const kisiShim = (h) => ({
    id: h.id, ad: h.ad, tip: 'kisi', doviz_cinsi: h.doviz_cinsi,
    ekstre_gun: null, aciklama: h.aciklama, aktif: h.aktif, created_at: h.created_at,
  })

  const yukleHesaplar = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: kisiAktif }, { data: kisiGecmis }, { data: kkAktif }, { data: kkGecmis }] = await Promise.all([
      supabase.from('hesaplar').select('*').eq('tip', 'borc').eq('aktif', true).order('sira'),
      supabase.from('hesaplar').select('*').eq('tip', 'borc').eq('aktif', false).order('sira'),
      supabase.from('borc_hesaplar').select('*').eq('tip', 'kk').eq('aktif', true).order('created_at'),
      supabase.from('borc_hesaplar').select('*').eq('tip', 'kk').eq('aktif', false).order('created_at'),
    ])
    const aHesaplar = [...(kisiAktif || []).map(kisiShim), ...(kkAktif || [])]
    setHesaplar(aHesaplar)

    // Aktif hesapların bakiyelerini yükle
    if (aHesaplar.length > 0) {
      const buAyVal = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
      const bakiyeMap = {}
      await Promise.all(aHesaplar.map(async (h) => {
        if (h.tip === 'kk') {
          const [{ data: kalemler }, { data: harcamalar }] = await Promise.all([
            supabase.from('borc_kalemler').select('tutar, odendi, donem').eq('hesap_id', h.id),
            supabase.from('borc_harcamalar').select('tutar, ekstre_kesildi').eq('hesap_id', h.id),
          ])
          const k = kalemler || []
          const bekleyenToplam = (harcamalar || [])
            .filter(r => !r.ekstre_kesildi).reduce((s, r) => s + (r.tutar || 0), 0)
          const toplam = k.filter(r => !r.odendi).reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
          const guncel = k.filter(r => !r.odendi && r.donem === buAyVal).reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
          bakiyeMap[h.id] = { bakiye: toplam, guncel, toplam }
        } else {
          // hesap_hareketler'de pozitif = alacak (bana borçlular); bu ekran
          // eskiden olduğu gibi pozitif = "ben borçluyum" bekliyor → işareti çevir
          const { data } = await supabase.from('hesap_hareketler').select('tutar').eq('hesap_id', h.id)
          const bak = -((data || []).reduce((s, r) => s + (r.tutar || 0), 0))
          bakiyeMap[h.id] = { bakiye: bak, guncel: null, toplam: null }
        }
      }))
      setAktifBakiyeler(bakiyeMap)
    }

    // Geçmiş hesapların bakiyelerini yükle
    const gHesaplar = [...(kisiGecmis || []).map(kisiShim), ...(kkGecmis || [])]
    setGecmisHesaplar(gHesaplar)
    if (gHesaplar.length > 0) {
      const bakiyeMap = {}
      await Promise.all(gHesaplar.map(async (h) => {
        if (h.tip === 'kk') {
          const { data } = await supabase.from('borc_kalemler').select('tutar').eq('hesap_id', h.id)
          bakiyeMap[h.id] = (data || []).reduce((s, r) => s + (r.tutar || 0), 0)
        } else {
          const { data } = await supabase.from('hesap_hareketler').select('tutar').eq('hesap_id', h.id)
          bakiyeMap[h.id] = -((data || []).reduce((s, r) => s + (r.tutar || 0), 0))
        }
      }))
      setGecmisBakiyeler(bakiyeMap)
    }
    setYukleniyor(false)
  }, [])

  const yukleDetay = useCallback(async (hesapId, tip) => {
    if (!hesapId) return
    if (tip === 'kisi') {
      // Kişi hareketleri artık hesap_hareketler'de — borc_kalemler-şekilli
      // nesnelere eşlenir (shim). İşaret AŞAMA 6 migrasyonunun tersine çevrilir:
      // eski ekran pozitif tutarı "ben borçluyum" (🔴 Borç) olarak yorumluyor,
      // yeni mimaride ise pozitif "bana borçlular" (alacak) anlamına geliyor.
      const { data } = await supabase.from('hesap_hareketler').select('*').eq('hesap_id', hesapId).order('tarih', { ascending: false })
      const satirlar = (data || []).map(row => {
        const eskiTutar = -(row.tutar || 0)
        return {
          id: row.id, hesap_id: row.hesap_id, tarih: row.tarih, donem: row.donem,
          tutar: eskiTutar, aciklama: row.aciklama,
          tur: eskiTutar >= 0 ? 'al' : 'ode',
          sira: row.sira, odendi: false, grup_id: row.grup_id ?? null,
        }
      })
      setHareketler(satirlar)
      setHarcamalar([])
    } else {
      const [{ data: k }, { data: h }] = await Promise.all([
        supabase.from('borc_kalemler').select('*').eq('hesap_id', hesapId).order('tarih', { ascending: false }),
        supabase.from('borc_harcamalar').select('*').eq('hesap_id', hesapId).order('tarih', { ascending: false }),
      ])
      setHareketler(k || [])
      setHarcamalar(h || [])
    }
  }, [])

  useEffect(() => { yukleHesaplar() }, [yukleHesaplar])
  useEffect(() => { if (secili) yukleDetay(secili.id, secili.tip) }, [secili, yukleDetay])

  // Sadece tek bir kişi hesabının kart bakiyesini sessizce günceller (spinner yok)
  const yukleBakiyeGuncelle = useCallback(async (hesapId) => {
    const { data } = await supabase.from('hesap_hareketler').select('tutar').eq('hesap_id', hesapId)
    const bak = -((data || []).reduce((s, r) => s + (r.tutar || 0), 0))
    setAktifBakiyeler(prev => ({ ...prev, [hesapId]: { bakiye: bak, guncel: null, toplam: null } }))
  }, [])

  const yenile = () => {
    if (secili?.tip === 'kisi') {
      // Kişi hesabı: sadece bu hesabın bakiyesini güncelle (spinner olmadan)
      yukleBakiyeGuncelle(secili.id)
      yukleDetay(secili.id, secili.tip)
    } else {
      // KK hesabı: tüm hesapları yenile (guncel/toplam hesaplaması için gerekli)
      yukleHesaplar()
      if (secili) yukleDetay(secili.id, secili.tip)
    }
  }

  const silHareket = async (id) => {
    if (!confirm('Silinsin mi?')) return
    if (seciliHesap?.tip === 'kisi') {
      const kayit = hareketler.find(r => r.id === id)
      if (kayit?.grup_id) {
        // Çift kayıtlı işlem: her iki bacağı birden sil (birikim + borç)
        await supabase.from('hesap_hareketler').delete().eq('grup_id', kayit.grup_id)
      } else {
        await supabase.from('hesap_hareketler').delete().eq('id', id)
      }
      yukleBakiyeGuncelle(secili.id) // kartı da güncelle
    } else {
      await supabase.from('borc_kalemler').delete().eq('id', id)
    }
    yukleDetay(secili.id, secili.tip)
  }

  const toggleOdendi = async (id, mevcutDurum) => {
    await supabase.from('borc_kalemler').update({ odendi: !mevcutDurum }).eq('id', id)
    yukleDetay(secili.id, secili.tip)
  }

  const silHarcama = async (id) => {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('borc_harcamalar').delete().eq('id', id)
    yukleDetay(secili.id, secili.tip)
  }

  // Büyükten küçüğe sıralanır: en yüksek sira değeri (en yeni kayıt) en üstte görünür
  const pesinSirali = harcamalar
    .filter(h => !h.ekstre_kesildi && h.harcama_tipi === 'pesin')
    .sort((a, b) => (b.sira ?? 0) - (a.sira ?? 0))

  // İki kaydın yerini değiştirir.
  // - sira değerleri zaten atanmışsa: sadece bu iki satırın sira'sını takas eder (ucuz).
  // - sira hiç atanmamışsa (null): bu hesap için ilk kullanımda, o anki görüntülenen
  //   sırayı esas alıp (takas uygulanmış haliyle) tüm listeyi normalize eder
  //   (büyükten küçüğe: en yeni kayıt en yüksek değeri alır).
  const siraTakasEt = async (idxA, idxB) => {
    const liste = pesinSirali
    const a = liste[idxA], b = liste[idxB]
    if (a.sira != null && b.sira != null) {
      await Promise.all([
        supabase.from('borc_harcamalar').update({ sira: b.sira }).eq('id', a.id),
        supabase.from('borc_harcamalar').update({ sira: a.sira }).eq('id', b.id),
      ])
    } else {
      const yeni = [...liste]
      ;[yeni[idxA], yeni[idxB]] = [yeni[idxB], yeni[idxA]]
      const n = yeni.length
      await Promise.all(
        yeni.map((h, i) => supabase.from('borc_harcamalar').update({ sira: n - 1 - i }).eq('id', h.id))
      )
    }
    yukleDetay(seciliHesap.id, seciliHesap.tip)
  }

  const yukariTasi = async () => {
    const idx = pesinSirali.findIndex(h => h.id === seciliSatirId)
    if (idx <= 0) return
    await siraTakasEt(idx, idx - 1)
  }

  const asagiTasi = async () => {
    const idx = pesinSirali.findIndex(h => h.id === seciliSatirId)
    if (idx < 0 || idx >= pesinSirali.length - 1) return
    await siraTakasEt(idx, idx + 1)
  }

  const kaydetPesin = async () => {
    if (!yeniSatir || !yeniSatir.tutar) return
    // Yeni kayıt, hesaptaki en büyük sira değerinden bir fazlasını alır → listenin başına gelir
    // ve mevcut kayıtların hiçbiri update görmez
    const maxSira = harcamalar.reduce((m, h) => Math.max(m, h.sira ?? 0), -1)
    await supabase.from('borc_harcamalar').insert({
      hesap_id: seciliHesap.id,
      tarih: yeniSatir.tarih,
      tutar: parseFloat(yeniSatir.tutar) || 0,
      kategori: yeniSatir.kategori || null,
      aciklama: yeniSatir.aciklama || null,
      harcama_tipi: 'pesin',
      taksit_sayisi: 1,
      ekstre_kesildi: false,
      sira: maxSira + 1,
    })
    setYeniSatir(null)
    yukleDetay(seciliHesap.id, seciliHesap.tip)
  }

  // Hesabı kapat → geçmişe taşır (aktif=false)
  const kapatHesap = async () => {
    if (!confirm(`"${secili.ad}" hesabı kapatılsın mı? Geçmiş sekmesinde görünmeye devam eder.`)) return
    if (secili.tip === 'kisi') {
      await supabase.from('hesaplar').update({ aktif: false }).eq('id', secili.id)
    } else {
      await supabase.from('borc_hesaplar').update({ aktif: false }).eq('id', secili.id)
    }
    setSecili(null)
    yukleHesaplar()
  }

  // Geçmişteki hesabı kalıcı sil
  const kaliciSil = async (id, ad, tip) => {
    if (!confirm(`"${ad}" hesabı ve tüm hareketleri kalıcı olarak silinsin mi?`)) return
    if (tip === 'kisi') {
      await supabase.from('hesap_hareketler').delete().eq('hesap_id', id)
      await supabase.from('hesaplar').delete().eq('id', id)
    } else {
      await supabase.from('borc_hesaplar').delete().eq('id', id)
    }
    yukleHesaplar()
  }

  // Geçmişteki hesabı yeniden aç
  const geriAc = async (id, tip) => {
    if (tip === 'kisi') {
      await supabase.from('hesaplar').update({ aktif: true }).eq('id', id)
    } else {
      await supabase.from('borc_hesaplar').update({ aktif: true }).eq('id', id)
    }
    yukleHesaplar()
  }

  const [seciliDonem, setSeciliDonem] = useState(null) // null = tümü

  // Hesap değişince: KK ise bu ayı seç, kişi ise tümünü göster
  useEffect(() => {
    if (!secili) return
    const hesap = hesaplar.find(h => h.id === secili.id)
    if (hesap?.tip === 'kk') {
      const n = new Date()
      setSeciliDonem(n.getFullYear() * 100 + n.getMonth() + 1)
    } else {
      setSeciliDonem(null)
    }
  }, [secili, hesaplar])

  // Hesap veya dönem değişince hareket seçimini sıfırla
  useEffect(() => { setSeciliHareketId(null) }, [secili, seciliDonem])

  const seciliHesap = hesaplar.find(h => h.id === secili?.id) || null
  const sembol = seciliHesap ? (SEMBOL[seciliHesap.doviz_cinsi] || seciliHesap.doviz_cinsi) : '₺'
  const bekleyenSayisi = harcamalar.filter(h => !h.ekstre_kesildi).length
  const bekleyenToplam = harcamalar.filter(h => !h.ekstre_kesildi).reduce((s, h) => s + (h.tutar || 0), 0)

  // Bakiye: sadece ödenmemiş kalemler
  const bakiye = hareketler.filter(r => !r.odendi).reduce((s, r) => s + (r.tutar || 0), 0)

  // KK özet hesapları
  const buAy = (() => { const n = new Date(); return n.getFullYear() * 100 + n.getMonth() + 1 })()
  const guncelBorc = hareketler
    .filter(r => !r.odendi && r.donem === buAy)
    .reduce((s, r) => s + (r.tutar || 0), 0) + bekleyenToplam
  const toplamBorc = bakiye + bekleyenToplam
  // Seçili dönem borcu (gelecek dönemde bekleyen harcamalar dahil edilmez)
  const secilenDonemBorc = seciliDonem
    ? hareketler.filter(r => !r.odendi && r.donem === seciliDonem).reduce((s, r) => s + (r.tutar || 0), 0)
      + (seciliDonem === buAy ? bekleyenToplam : 0)
    : guncelBorc

  // Dönem listesi — sadece kayıt olan dönemler
  const donemler = [...new Set(hareketler.map(r => r.donem).filter(Boolean))].sort((a, b) => a - b)

  const donemLabel = (d) => {
    const y = Math.floor(d / 100), m = d % 100
    return `${y}/${String(m).padStart(2, '0')}`
  }

  // Filtrelenmiş + sıralanmış hareketler
  // - KK hesapta dönem seçiliyse: o döneme filtrelenir + sira sırasına göre gösterilir
  // - Kişi hesapta: tüm kayıtlar (dönem filtresi yok) sira sırasına göre gösterilir
  // - Aksi halde (KK, dönem seçili değilken): tarih sırası
  const siralamaAktifMi = !!seciliDonem || seciliHesap?.tip === 'kisi'
  const gosterilecekHareketler = (() => {
    const base = seciliDonem
      ? hareketler.filter(r => r.donem === seciliDonem)
      : hareketler
    if (!siralamaAktifMi) return base
    return [...base].sort((a, b) => {
      if (a.sira != null && b.sira != null) return b.sira - a.sira
      if (a.sira == null && b.sira == null) return new Date(b.tarih) - new Date(a.tarih)
      return a.sira != null ? -1 : 1
    })
  })()

  const hareketSiralamaAktif = siralamaAktifMi
  const seciliHareketIdx = gosterilecekHareketler.findIndex(r => r.id === seciliHareketId)

  // İki kaydın yerini değiştirir.
  // - sira değerleri zaten atanmışsa: sadece bu iki satırın sira'sını takas eder (ucuz).
  // - sira hiç atanmamışsa (null): bu dönem için ilk kullanımda, o anki görüntülenen
  //   sırayı esas alıp (takas uygulanmış haliyle) tüm listeyi azalan şekilde normalize eder
  //   (en üstteki en yüksek sira değerini alır — yeni kayıtlarla tutarlı olsun diye).
  const siraTakasEtHareket = async (idxA, idxB) => {
    const liste = gosterilecekHareketler
    const a = liste[idxA], b = liste[idxB]
    const tablo = seciliHesap.tip === 'kisi' ? 'hesap_hareketler' : 'borc_kalemler'
    if (a.sira != null && b.sira != null) {
      await Promise.all([
        supabase.from(tablo).update({ sira: b.sira }).eq('id', a.id),
        supabase.from(tablo).update({ sira: a.sira }).eq('id', b.id),
      ])
    } else {
      const yeni = [...liste]
      ;[yeni[idxA], yeni[idxB]] = [yeni[idxB], yeni[idxA]]
      const n = yeni.length
      await Promise.all(
        yeni.map((r, i) => supabase.from(tablo).update({ sira: n - 1 - i }).eq('id', r.id))
      )
    }
    yukleDetay(seciliHesap.id, seciliHesap.tip)
  }

  const yukariTasiHareket = async () => {
    const idx = gosterilecekHareketler.findIndex(r => r.id === seciliHareketId)
    if (idx <= 0) return
    await siraTakasEtHareket(idx, idx - 1)
  }

  const asagiTasiHareket = async () => {
    const idx = gosterilecekHareketler.findIndex(r => r.id === seciliHareketId)
    if (idx < 0 || idx >= gosterilecekHareketler.length - 1) return
    await siraTakasEtHareket(idx, idx + 1)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Borç / Alacak</h2>
        {sekme === 'aktif' && (
          <button onClick={() => setForm('hesap')}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium">
            <Plus size={15} /> Hesap Ekle
          </button>
        )}
      </div>

      {/* Sekme Seçici */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => { setSekme('aktif'); setSecili(null) }}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            sekme === 'aktif' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
          }`}>
          Aktif
        </button>
        <button onClick={() => { setSekme('gecmis'); setSecili(null) }}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            sekme === 'gecmis' ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-200 text-slate-500'
          }`}>
          Geçmiş
          {gecmisHesaplar.length > 0 && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${sekme === 'gecmis' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {gecmisHesaplar.length}
            </span>
          )}
        </button>
      </div>

      {/* GEÇMİŞ SEKMESİ */}
      {sekme === 'gecmis' && (
        yukleniyor ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gecmisHesaplar.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm space-y-1">
            <p className="text-2xl">🗂️</p>
            <p>Geçmiş hesap yok.</p>
            <p>Kapatılan hesaplar burada görünür.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gecmisHesaplar.map(h => {
              const bak = gecmisBakiyeler[h.id] || 0
              const sem = SEMBOL[h.doviz_cinsi] || h.doviz_cinsi
              return (
                <div key={h.id} className="bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {h.tip === 'kk'
                        ? <CreditCard size={16} className="text-purple-400" />
                        : <User size={16} className="text-slate-400" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{h.ad}</p>
                        <p className="text-xs text-slate-400">{h.tip === 'kk' ? 'Kredi Kartı' : 'Kişi'} · {h.doviz_cinsi}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-bold ${bak > 0 ? 'text-red-500' : bak < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {sem}{formatPara(Math.abs(bak))}
                      </p>
                      <p className="text-xs text-slate-400">{bak > 0 ? 'Borç' : bak < 0 ? 'Alacak' : 'Sıfır'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => geriAc(h.id, h.tip)}
                      className="flex-1 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                      Yeniden Aç
                    </button>
                    <button onClick={() => kaliciSil(h.id, h.ad, h.tip)}
                      className="flex-1 py-1.5 rounded-xl border border-red-200 text-red-400 text-xs font-medium hover:bg-red-50 transition-colors">
                      Kalıcı Sil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* AKTİF SEKMESİ */}
      {sekme === 'aktif' && (
      <>
      {/* Hesap Kartları */}
      {yukleniyor ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hesaplar.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm space-y-1">
          <p className="text-2xl">📋</p>
          <p>Henüz hesap yok.</p>
          <p>Yukarıdan "Hesap Ekle" ile başlayın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[...hesaplar].sort((a, b) => (a.tip === 'kk' ? -1 : 1) - (b.tip === 'kk' ? -1 : 1)).map(h => {
            const isSecili = secili?.id === h.id
            const detay = aktifBakiyeler[h.id] || { bakiye: 0, guncel: null, toplam: null }
            const bak = detay.bakiye
            const sem = SEMBOL[h.doviz_cinsi] || h.doviz_cinsi

            // Renk belirleme
            let bg, border, text
            if (h.tip === 'kk') {
              bg = isSecili ? 'bg-blue-600' : 'bg-blue-50'
              border = isSecili ? 'border-blue-600' : 'border-blue-200'
              text = isSecili ? 'text-white' : 'text-blue-800'
            } else if (bak > 0) {
              bg = isSecili ? 'bg-red-500' : 'bg-red-50'
              border = isSecili ? 'border-red-500' : 'border-red-200'
              text = isSecili ? 'text-white' : 'text-red-800'
            } else if (bak < 0) {
              bg = isSecili ? 'bg-green-600' : 'bg-green-50'
              border = isSecili ? 'border-green-600' : 'border-green-200'
              text = isSecili ? 'text-white' : 'text-green-800'
            } else {
              bg = isSecili ? 'bg-slate-600' : 'bg-slate-50'
              border = isSecili ? 'border-slate-600' : 'border-slate-200'
              text = isSecili ? 'text-white' : 'text-slate-700'
            }
            const subText = isSecili ? 'opacity-75' : 'opacity-60'

            return (
              <button key={h.id} onClick={() => setSecili(h)}
                className={`rounded-2xl p-3 text-left w-full transition-all border-2 shadow-sm ${bg} ${border} ${text}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  {h.tip === 'kk'
                    ? <CreditCard size={13} className="flex-shrink-0" />
                    : <User size={13} className="flex-shrink-0" />}
                  <span className="text-xs font-semibold truncate">{h.ad}</span>
                </div>
                {/* Özet bakiye */}
                {h.tip === 'kk' && detay.guncel !== null ? (
                  <div className="space-y-1 mt-1">
                    <div>
                      <p className={`text-xs ${subText}`}>Güncel</p>
                      <p className="text-sm font-bold leading-tight">{sem}{formatPara(detay.guncel)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${subText}`}>Toplam</p>
                      <p className="text-sm font-bold leading-tight">{sem}{formatPara(detay.toplam)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-base font-bold leading-tight">{sem}{formatPara(Math.abs(bak))}</p>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                      {bak > 0 ? 'Borç' : bak < 0 ? 'Alacak' : 'Kapalı'}
                    </p>
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Seçili Hesap Detayı */}
      {seciliHesap && (
        <>
          {/* Özet Kart */}
          <div className={`rounded-2xl p-4 mb-4 ${seciliHesap.tip === 'kk' ? 'bg-purple-50 border border-purple-100' : 'bg-red-50 border border-red-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-500">
                {seciliHesap.tip === 'kk' ? '💳 Kredi Kartı' : '👤 Kişi'} — {seciliHesap.ad}
                {seciliHesap.tip === 'kk' && seciliHesap.ekstre_gun && (
                  <span className="ml-1 text-slate-400">· Ekstre: {seciliHesap.ekstre_gun}. gün</span>
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setForm('duzenle-hesap')} title="Hesabı düzenle"
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={kapatHesap} title="Hesabı kapat (geçmişe taşı)"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-400 hover:border-red-200 hover:text-red-400 transition-colors">
                  Kapat
                </button>
              </div>
            </div>

            {seciliHesap.tip === 'kk' ? (
              /* KK: Güncel borç + Toplam borç */
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-xs text-slate-400 mb-1">
                    {seciliDonem && seciliDonem !== buAy ? donemLabel(seciliDonem) : 'Bu Ay'}
                  </p>
                  <p className="text-lg font-bold text-purple-700">{sembol}{formatPara(secilenDonemBorc)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {seciliDonem && seciliDonem !== buAy ? 'Sadece taksitler' : 'Taksit + Bekleyen'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-xs text-slate-400 mb-1">Toplam Borç</p>
                  <p className="text-lg font-bold text-red-600">{sembol}{formatPara(toplamBorc)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tüm ödenmemiş</p>
                </div>
              </div>
            ) : (
              /* Kişi: tek bakiye */
              <div>
                <p className={`text-2xl font-bold ${bakiye > 0 ? 'text-red-600' : bakiye < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {sembol}{formatPara(Math.abs(bakiye))}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bakiye > 0 ? '🔴 Borç var' : bakiye < 0 ? '🟢 Alacak var' : 'Kapalı'}
                </p>
              </div>
            )}

            {/* KK - Bekleyen harcama uyarısı */}
            {seciliHesap.tip === 'kk' && bekleyenSayisi > 0 && (
              <div className="mt-3 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-orange-700 font-medium">
                  {bekleyenSayisi} bekleyen · {sembol}{formatPara(bekleyenToplam)}
                </p>
                <button onClick={() => setForm('ekstre')}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                  <Scissors size={11} /> Kes
                </button>
              </div>
            )}

            {/* KK - Ekstre dönemi seçici */}
            {seciliHesap.tip === 'kk' && donemler.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-slate-500 flex-shrink-0">Ekstre Dönemi:</label>
                <select value={seciliDonem || ''} onChange={e => setSeciliDonem(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Tümü</option>
                  {donemler.map(d => (
                    <option key={d} value={d}>
                      {donemLabel(d)}{d === buAy ? ' (Bu Ay)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex gap-2 mb-5">
            {seciliHesap.tip === 'kisi' ? (
              <button onClick={() => setForm('alode')}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">
                ↑↓ Al / Öde
              </button>
            ) : (
              <>
                <button onClick={() => setForm('harcama')}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-1.5">
                  <Plus size={14} /> Taksitli Harcama
                </button>
                <button onClick={() => setForm('ekstre')}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium flex items-center justify-center gap-1.5">
                  <Scissors size={14} /> Ekstre Kes
                  {bekleyenSayisi > 0 && (
                    <span className="bg-white text-orange-500 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {bekleyenSayisi}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* KK - Tek Çekim Bekleyen Harcamalar Tablosu */}
          {seciliHesap.tip === 'kk' && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <p className="text-xs font-semibold text-orange-600">⏳ Tek Çekim Harcamalar</p>
                <div className="flex items-center gap-1">
                  <button onClick={yukariTasi} disabled={!seciliSatirId || pesinSirali.findIndex(h => h.id === seciliSatirId) <= 0}
                    className="w-6 h-6 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={asagiTasi} disabled={!seciliSatirId || pesinSirali.findIndex(h => h.id === seciliSatirId) >= pesinSirali.length - 1}
                    className="w-6 h-6 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                    <ChevronDown size={13} />
                  </button>
                  <button onClick={() => { setYeniSatir({ kategori: GIDER_KATEGORILER[0], aciklama: '', tarih: yerelTarih(new Date()), tutar: '' }); setSeciliSatirId(null) }}
                    className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <div className="border border-orange-100 rounded-xl overflow-hidden">
                {/* Başlık */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] bg-orange-50 border-b border-orange-100 text-xs font-semibold text-orange-700 px-2 py-1.5 gap-1">
                  <span>Kategori</span>
                  <span>Açıklama</span>
                  <span className="w-20 text-center">Tarih</span>
                  <span className="w-16 text-right">Tutar</span>
                  <span className="w-12"></span>
                </div>

                {/* Yeni satır */}
                {yeniSatir && (
                  <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] border-b border-orange-100 bg-amber-50 px-2 py-1 gap-1 items-center">
                    <select value={yeniSatir.kategori} onChange={e => setYeniSatir(s => ({ ...s, kategori: e.target.value }))}
                      className="text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none w-full">
                      {GIDER_KATEGORILER.map(k => <option key={k}>{k}</option>)}
                    </select>
                    <input type="text" value={yeniSatir.aciklama} onChange={e => setYeniSatir(s => ({ ...s, aciklama: e.target.value }))}
                      placeholder="Açıklama"
                      className="text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none w-full" />
                    <TarihInput value={yeniSatir.tarih} onChange={v => setYeniSatir(s => ({ ...s, tarih: v }))}
                      className="w-20 text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none" />
                    <input type="number" step="0.01" min="0" value={yeniSatir.tutar} onChange={e => setYeniSatir(s => ({ ...s, tutar: e.target.value }))}
                      placeholder="0"
                      className="w-16 text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none text-right" />
                    <div className="w-12 flex gap-1 justify-end">
                      <button onClick={kaydetPesin} className="p-1 rounded text-green-600 hover:bg-green-100"><Check size={13} /></button>
                      <button onClick={() => setYeniSatir(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X size={13} /></button>
                    </div>
                  </div>
                )}

                {/* Mevcut peşin harcamalar */}
                {pesinSirali.length === 0 && !yeniSatir ? (
                  <div className="text-center py-3 text-xs text-slate-400">Kayıt yok</div>
                ) : (
                  pesinSirali.map(h => {
                    const isSecili = h.id === seciliSatirId
                    return (
                      <div key={h.id}
                        onClick={() => setSeciliSatirId(id => id === h.id ? null : h.id)}
                        className={`grid grid-cols-[1fr_1fr_auto_auto_auto] border-b border-orange-50 last:border-0 px-2 py-1.5 gap-1 items-center cursor-pointer transition-colors ${isSecili ? 'bg-amber-100 border-amber-200' : 'hover:bg-orange-50'}`}>
                        <span className={`text-xs truncate ${isSecili ? 'text-amber-800 font-semibold' : 'text-slate-700'}`}>{h.kategori || '—'}</span>
                        <span className="text-xs text-slate-500 truncate">{h.aciklama || '—'}</span>
                        <span className="w-20 text-xs text-slate-500 text-center">{formatTarih(h.tarih)}</span>
                        <span className={`w-16 text-xs font-semibold text-right ${isSecili ? 'text-amber-700' : 'text-orange-600'}`}>₺{formatPara(h.tutar)}</span>
                        <div className="w-12 flex gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setDuzenleHarcama(h)} className="p-1 rounded hover:bg-blue-100 text-slate-300 hover:text-blue-500"><Pencil size={12} /></button>
                          <button onClick={() => silHarcama(h.id)} className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Hareket Geçmişi */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-xs font-semibold text-slate-500">
              📝 Hareketler {seciliDonem ? `— ${donemLabel(seciliDonem)}` : ''}
            </p>
          </div>
          {gosterilecekHareketler.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Bu dönemde hareket yok.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="text-left px-3 py-2.5 font-semibold w-[84px]">Tarih</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Açıklama</th>
                    {seciliHesap?.tip === 'kk' && (
                      <th className="text-center px-2 py-2.5 font-semibold w-8">✓</th>
                    )}
                    <th className="text-right px-3 py-2.5 font-semibold w-24">Tutar</th>
                    <th className="w-16 pr-2">
                      {hareketSiralamaAktif && (
                        <div className="flex gap-0.5 justify-end">
                          <button onClick={yukariTasiHareket}
                            disabled={!seciliHareketId || seciliHareketIdx <= 0}
                            className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                            <ChevronUp size={13} />
                          </button>
                          <button onClick={asagiTasiHareket}
                            disabled={!seciliHareketId || seciliHareketIdx >= gosterilecekHareketler.length - 1}
                            className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                            <ChevronDown size={13} />
                          </button>
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gosterilecekHareketler.map(r => {
                    const isSecili = r.id === seciliHareketId
                    const aciklama = r.aciklama || (r.tur === 'ekstre' ? 'Ekstre' : r.tur === 'taksit' ? 'Taksit' : r.tur === 'al' ? 'Alındı' : 'Ödendi')
                    return (
                      <tr key={r.id}
                        onClick={() => hareketSiralamaAktif && setSeciliHareketId(id => id === r.id ? null : r.id)}
                        className={`border-b border-slate-50 last:border-0 transition-colors ${
                          hareketSiralamaAktif ? 'cursor-pointer' : ''
                        } ${isSecili ? 'bg-amber-50' : r.odendi ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-slate-50'}`}>
                        {/* Tarih + sol kenar */}
                        <td className={`pl-3 pr-2 py-2 whitespace-nowrap border-l-2 ${
                          isSecili ? 'text-amber-700 border-amber-400' :
                          r.odendi ? 'text-slate-400 border-green-300' :
                          r.tutar > 0 ? 'text-slate-400 border-red-400' : 'text-slate-400 border-green-400'
                        }`}>
                          {formatTarih(r.tarih)}
                        </td>
                        {/* Açıklama + badges */}
                        <td className="px-3 py-2">
                          <span className={`font-medium ${
                            isSecili ? 'text-amber-800' :
                            r.odendi ? 'text-slate-400 line-through' :
                            r.tutar > 0 ? 'text-slate-700' : 'text-green-700'
                          }`}>
                            {aciklama}
                          </span>
                          <span className="ml-1.5 inline-flex gap-1 flex-wrap">
                            {r.kategori && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{r.kategori}</span>
                            )}
                            {r.taksit_no && (
                              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                                {r.taksit_no}/{r.taksit_toplam}
                              </span>
                            )}
                            {r.odendi && (
                              <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">✓</span>
                            )}
                          </span>
                        </td>
                        {/* Ödendi checkbox (sadece KK) */}
                        {seciliHesap?.tip === 'kk' && (
                          <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleOdendi(r.id, r.odendi)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                                r.odendi ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                              }`}>
                              {r.odendi && <span className="text-[10px] leading-none">✓</span>}
                            </button>
                          </td>
                        )}
                        {/* Tutar */}
                        <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${
                          isSecili ? 'text-amber-700' :
                          r.odendi ? 'text-slate-400' :
                          r.tutar > 0 ? 'text-red-500' : 'text-green-600'
                        }`}>
                          {r.tutar > 0 ? '+' : ''}{sembol}{formatPara(Math.abs(r.tutar))}
                        </td>
                        {/* Aksiyonlar */}
                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-0.5 justify-end">
                            <button onClick={() => setDuzenleKalem(r)}
                              className="p-1.5 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => silHareket(r.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={seciliHesap?.tip === 'kk' ? 3 : 2} className="px-3 py-2 text-slate-400">
                      {gosterilecekHareketler.length} kayıt
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${
                      gosterilecekHareketler.filter(r => !r.odendi).reduce((s, r) => s + r.tutar, 0) > 0
                        ? 'text-red-500' : 'text-green-600'
                    }`}>
                      {sembol}{formatPara(Math.abs(gosterilecekHareketler.filter(r => !r.odendi).reduce((s, r) => s + r.tutar, 0)))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      </>
      )} {/* /aktif sekme */}

      {/* Formlar */}
      {form === 'hesap' && <HesapFormu onKapat={() => setForm(null)} onKayit={yenile} />}
      {form === 'duzenle-hesap' && seciliHesap && (
        <HesapDuzenleFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={() => { setForm(null); yukleHesaplar(); yukleDetay(seciliHesap.id, seciliHesap.tip) }} />
      )}
      {duzenleHarcama && (
        <HarcamaDuzenleFormu harcama={duzenleHarcama}
          onKapat={() => setDuzenleHarcama(null)}
          onKayit={() => { setDuzenleHarcama(null); yukleDetay(seciliHesap.id, seciliHesap.tip) }} />
      )}
      {duzenleKalem && seciliHesap && (
        duzenleKalem.tur === 'taksit' && duzenleKalem.grup_id
          ? <TaksitGrubuDuzenleFormu
              grupId={duzenleKalem.grup_id}
              hesapId={seciliHesap.id}
              doviz_cinsi={seciliHesap.doviz_cinsi}
              onKapat={() => setDuzenleKalem(null)}
              onKayit={() => { setDuzenleKalem(null); yukleDetay(seciliHesap.id, seciliHesap.tip) }} />
          : <KalemDuzenleFormu kalem={duzenleKalem} doviz_cinsi={seciliHesap.doviz_cinsi} tip={seciliHesap.tip}
              onKapat={() => setDuzenleKalem(null)} onKayit={() => { setDuzenleKalem(null); yukleDetay(seciliHesap.id, seciliHesap.tip) }} />
      )}
      {form === 'alode' && seciliHesap?.tip === 'kisi' && (
        <AlOdeFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={yenile} />
      )}
      {form === 'harcama' && seciliHesap?.tip === 'kk' && (
        <HarcamaFormu hesap={seciliHesap} onKapat={() => setForm(null)} onKayit={yenile} />
      )}
      {form === 'ekstre' && seciliHesap?.tip === 'kk' && (
        <EkstreFormu
          hesap={seciliHesap}
          harcamalar={harcamalar}
          donemHareketler={seciliDonem ? hareketler.filter(r => r.donem === seciliDonem) : hareketler.filter(r => r.donem === buAy)}
          seciliDonem={seciliDonem || buAy}
          onKapat={() => setForm(null)}
          onKayit={yenile} />
      )}
    </div>
  )
}
