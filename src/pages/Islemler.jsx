import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { buDonem, donemLabel, formatPara, formatTarih, tarihtenDonem, yerelTarih, GIDER_KATEGORILER, GELIR_TURLERI } from '../db'
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown } from 'lucide-react'
import TarihInput from '../components/TarihInput'
import { useMask } from '../MaskContext'

// 2016/05'ten bugüne tüm dönemleri üret (en yeniden en eskiye)
function donemListesi() {
  const list = []
  const baslangic = 201605
  const bugun = buDonem()
  for (let d = bugun; d >= baslangic; ) {
    list.push(d)
    const yil = Math.floor(d / 100)
    const ay = d % 100
    if (ay === 1) d = (yil - 1) * 100 + 12
    else d = yil * 100 + (ay - 1)
  }
  return list
}

function DuzenleFormu({ kayit, onKapat, onKayit }) {
  const tur = kayit._tur
  const kategoriler = tur === 'gider' ? GIDER_KATEGORILER : GELIR_TURLERI
  const [form, setForm] = useState({
    tarih: kayit.tarih ? yerelTarih(kayit.tarih) : '',
    kategori: kayit.kategori || '',
    k: String(kayit.k || ''),
    hesap: kayit.hesap || 'K',
    aciklama: kayit.aciklama || '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const yeniTutar = parseFloat(form.k) || 0
    const yeniDonem = tarihtenDonem(form.tarih)

    // Ana kaydı güncelle
    await supabase.from(kayit._tablo).update({
      tarih: form.tarih,
      donem: yeniDonem,
      k: yeniTutar,
      hesap: form.hesap,
      aciklama: form.aciklama,
      ...(tur === 'gider' ? { kategori: form.kategori } : { tur: form.kategori }),
    }).eq('id', kayit.id)

    // Birikim kategoriliyse eşli birikim_hareketler kaydını güncelle
    if (kayit.grup_id && form.kategori === 'Birikim') {
      // Gider "Birikim" → birikim_hareketler pozitif (yatırıma gelen)
      // Gelir "Birikim" → birikim_hareketler negatif (yatırımdan çekilen)
      const birikimMiktar = tur === 'gider' ? yeniTutar : -yeniTutar
      await supabase.from('birikim_hareketler').update({
        tarih: form.tarih,
        miktar: birikimMiktar,
        islem_tl: birikimMiktar,
      }).eq('grup_id', kayit.grup_id)
    }

    onKayit(); onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">✏️ {tur === 'gider' ? 'Gider' : 'Gelir'} Düzenle</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {kategoriler.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.k}
              onChange={e => setForm(f => ({ ...f, k: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap</label>
            <div className="flex gap-2">
              {[['K', '🏦 Banka'], ['N', '💵 Nakit']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, hesap: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.hesap === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
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

function IslemFormu({ tur, onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: yerelTarih(new Date()),
    kategori: tur === 'gider' ? GIDER_KATEGORILER[0] : GELIR_TURLERI[0],
    k: '',
    hesap: 'K',
    aciklama: '',
  })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    const tutar = parseFloat(form.k) || 0
    const donem = tarihtenDonem(form.tarih)
    const kayit = { tarih: form.tarih, donem, k: tutar, aciklama: form.aciklama }

    if (tur === 'gider') {
      const grupId = form.kategori === 'Birikim' ? crypto.randomUUID() : null
      await supabase.from('giderler').insert({ ...kayit, kategori: form.kategori, hesap: form.hesap, grup_id: grupId })

      // Gider "Birikim" → Birikim (TL) hesabına pozitif kayıt
      if (form.kategori === 'Birikim') {
        await supabase.from('birikim_hareketler').insert({
          tarih: form.tarih, tur: 'Birikim (TL)', doviz_cinsi: 'TL',
          alt_tip: 'Birikim', miktar: tutar, islem_tl: tutar,
          aciklama: 'yatırıma gelen', grup_id: grupId,
        })
      }
    } else {
      const grupId = form.kategori === 'Birikim' ? crypto.randomUUID() : null
      await supabase.from('gelirler').insert({ ...kayit, tur: form.kategori, hesap: form.hesap, grup_id: grupId })

      // Gelir "Birikim" → Birikim (TL) hesabından negatif kayıt
      if (form.kategori === 'Birikim') {
        await supabase.from('birikim_hareketler').insert({
          tarih: form.tarih, tur: 'Birikim (TL)', doviz_cinsi: 'TL',
          alt_tip: 'Birikim', miktar: -tutar, islem_tl: -tutar,
          aciklama: 'yatırım hesabından çekilen', grup_id: grupId,
        })
      }
    }

    onKayit()
    onKapat()
  }

  const kategoriler = tur === 'gider' ? GIDER_KATEGORILER : GELIR_TURLERI

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{tur === 'gider' ? '➖ Gider Ekle' : '➕ Gelir Ekle'}</h3>
        </div>
        <form onSubmit={kaydet} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tarih</label>
            <TarihInput value={form.tarih} onChange={v => setForm(f => ({ ...f, tarih: v }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {kategoriler.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Tutar (₺)</label>
            <input type="number" step="0.01" min="0" value={form.k}
              onChange={e => setForm(f => ({ ...f, k: e.target.value }))}
              placeholder="0,00"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Hesap</label>
            <div className="flex gap-2">
              {[['K', '🏦 Banka'], ['N', '💵 Nakit']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, hesap: val }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.hesap === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              placeholder="İsteğe bağlı..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">İptal</button>
            <button type="submit" disabled={kaydediliyor}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Islemler() {
  const { maskeli } = useMask()
  const [donem, setDonem] = useState(buDonem())
  const [form, setForm] = useState(null)
  const [duzenle, setDuzenle] = useState(null)
  const [islemler, setIslemler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliSatirId, setSeciliSatirId] = useState(null)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: gel }, { data: gid }] = await Promise.all([
      supabase.from('gelirler').select('*').eq('donem', donem).order('sira', { ascending: true, nullsFirst: false }).order('tarih', { ascending: false }),
      supabase.from('giderler').select('*').eq('donem', donem).order('sira', { ascending: true, nullsFirst: false }).order('tarih', { ascending: false }),
    ])
    const birlesik = [
      ...(gel || []).map(r => ({ ...r, _tur: 'gelir', _tablo: 'gelirler', kategori: r.tur })),
      ...(gid || []).map(r => ({ ...r, _tur: 'gider', _tablo: 'giderler' })),
    ].sort((a, b) => {
      if (a.sira != null && b.sira != null) return a.sira - b.sira
      if (a.sira == null && b.sira == null) return new Date(b.tarih) - new Date(a.tarih)
      return a.sira != null ? -1 : 1
    })
    setIslemler(birlesik)
    setYukleniyor(false)
  }, [donem])

  useEffect(() => { yukle() }, [yukle])
  // Dönem değişince seçimi sıfırla
  useEffect(() => { setSeciliSatirId(null) }, [donem])

  const DONEMLER = donemListesi()

  const sil = async (tablo, id) => {
    if (!confirm('Bu işlem silinsin mi?')) return
    const kayit = islemler.find(r => r._tablo === tablo && r.id === id)
    await supabase.from(tablo).delete().eq('id', id)
    if (kayit?.grup_id) {
      await supabase.from('birikim_hareketler').delete().eq('grup_id', kayit.grup_id)
    }
    yukle()
  }

  // İki kaydın sira değerini takas eder (farklı tablolarda olabilirler) — sadece bu iki satır update görür
  const siraTakasEt = async (a, b) => {
    await Promise.all([
      supabase.from(a._tablo).update({ sira: b.sira ?? 0 }).eq('id', a.id),
      supabase.from(b._tablo).update({ sira: a.sira ?? 0 }).eq('id', b.id),
    ])
    yukle()
  }

  const satirKey = (r) => `${r._tablo}-${r.id}`

  const yukariTasi = async () => {
    const idx = islemler.findIndex(r => satirKey(r) === seciliSatirId)
    if (idx <= 0) return
    await siraTakasEt(islemler[idx], islemler[idx - 1])
  }

  const asagiTasi = async () => {
    const idx = islemler.findIndex(r => satirKey(r) === seciliSatirId)
    if (idx < 0 || idx >= islemler.length - 1) return
    await siraTakasEt(islemler[idx], islemler[idx + 1])
  }

  const seciliIdx = islemler.findIndex(r => satirKey(r) === seciliSatirId)

  const toplamGelir = islemler.filter(r => r._tur === 'gelir').reduce((s, r) => s + (r.k || 0), 0)
  const toplamGider = islemler.filter(r => r._tur === 'gider').reduce((s, r) => s + (r.k || 0), 0)
  const net = toplamGelir - toplamGider

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={donem}
          onChange={e => setDonem(parseInt(e.target.value))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          {DONEMLER.map(d => (
            <option key={d} value={d}>{donemLabel(d)}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setForm('gider')}
            className="flex items-center gap-1 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl font-medium">
            <Plus size={15} /> Gider
          </button>
          <button onClick={() => setForm('gelir')}
            className="flex items-center gap-1 bg-green-50 text-green-600 text-sm px-3 py-2 rounded-xl font-medium">
            <Plus size={15} /> Gelir
          </button>
        </div>
      </div>

      {/* Dönem Özeti */}
      {!yukleniyor && islemler.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Gelir</p>
            <p className="text-sm font-bold text-green-700">₺{formatPara(toplamGelir)}</p>
          </div>
          <div className="flex-1 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Gider</p>
            <p className="text-sm font-bold text-red-600">₺{formatPara(toplamGider)}</p>
          </div>
          <div className={`flex-1 border rounded-xl px-3 py-2 ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Net</p>
            <p className={`text-sm font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
              {net >= 0 ? '+' : ''}₺{formatPara(Math.abs(net))}
            </p>
          </div>
        </div>
      )}

      {/* Tablo */}
      {yukleniyor ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : islemler.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Bu dönemde işlem yok.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                <th className="text-left px-3 py-2.5 font-semibold w-[88px]">Tarih</th>
                <th className="text-left px-3 py-2.5 font-semibold">Kategori</th>
                <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Açıklama</th>
                <th className="text-center px-2 py-2.5 font-semibold w-8">H</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">Tutar</th>
                <th className="w-16 pr-2">
                  <div className="flex gap-0.5 justify-end">
                    <button onClick={yukariTasi}
                      disabled={!seciliSatirId || seciliIdx <= 0}
                      className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={asagiTasi}
                      disabled={!seciliSatirId || seciliIdx >= islemler.length - 1}
                      className="w-6 h-6 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors">
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {islemler.map(r => {
                const key = satirKey(r)
                const isSecili = key === seciliSatirId
                return (
                  <tr key={key}
                    onClick={() => setSeciliSatirId(id => id === key ? null : key)}
                    className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                      isSecili ? 'bg-amber-50 border-amber-100' : 'hover:bg-slate-50'
                    }`}>
                    {/* Tarih — sol kenar rengi ile tür göstergesi */}
                    <td className={`pl-3 pr-2 py-2 whitespace-nowrap border-l-2 ${
                      isSecili ? 'text-amber-700 border-amber-400' :
                      r._tur === 'gelir' ? 'text-slate-400 border-green-400' : 'text-slate-400 border-red-400'
                    }`}>
                      {formatTarih(r.tarih)}
                    </td>
                    {/* Kategori + mobile açıklama */}
                    <td className="px-3 py-2">
                      <span className={`font-semibold ${
                        isSecili ? 'text-amber-800' :
                        r._tur === 'gelir' ? 'text-green-700' : 'text-slate-700'
                      }`}>
                        {r.kategori}
                      </span>
                      {r.aciklama && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[110px] sm:hidden mt-0.5">
                          {r.aciklama}
                        </span>
                      )}
                    </td>
                    {/* Açıklama — sadece geniş ekranda */}
                    <td className="px-3 py-2 text-slate-400 max-w-[140px] truncate hidden sm:table-cell">
                      {r.aciklama || <span className="text-slate-300">—</span>}
                    </td>
                    {/* Hesap */}
                    <td className="px-2 py-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        r.hesap === 'N' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                        {r.hesap === 'N' ? 'N' : 'B'}
                      </span>
                    </td>
                    {/* Tutar */}
                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${
                      isSecili ? 'text-amber-700' :
                      r._tur === 'gelir' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {r._tur === 'gelir' ? '+' : '-'}₺{maskeli && r.kategori === 'Maaş' ? '••••' : formatPara(r.k)}
                    </td>
                    {/* Aksiyonlar */}
                    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <button onClick={() => setDuzenle(r)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-400 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => sil(r._tablo, r.id)}
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
                <td colSpan="4" className="px-3 py-2 text-slate-400">
                  {islemler.length} işlem
                </td>
                <td className={`px-3 py-2 text-right font-bold ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {net >= 0 ? '+' : ''}₺{formatPara(Math.abs(net))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {form && <IslemFormu tur={form} onKapat={() => setForm(null)} onKayit={yukle} />}
      {duzenle && <DuzenleFormu kayit={duzenle} onKapat={() => setDuzenle(null)} onKayit={yukle} />}
    </div>
  )
}
