import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { buDonem, donemLabel, formatPara, GIDER_KATEGORILER, GELIR_TURLERI } from '../db'
import { Plus, Trash2 } from 'lucide-react'

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

function IslemFormu({ tur, donem, onKapat, onKayit }) {
  const [form, setForm] = useState({
    tarih: new Date().toISOString().split('T')[0],
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
            <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
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
  const [donem, setDonem] = useState(buDonem())
  const [form, setForm] = useState(null)
  const [islemler, setIslemler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: gel }, { data: gid }] = await Promise.all([
      supabase.from('gelirler').select('*').eq('donem', donem).order('tarih', { ascending: false }),
      supabase.from('giderler').select('*').eq('donem', donem).order('tarih', { ascending: false }),
    ])
    const birlesik = [
      ...(gel || []).map(r => ({ ...r, _tur: 'gelir', _tablo: 'gelirler', kategori: r.tur })),
      ...(gid || []).map(r => ({ ...r, _tur: 'gider', _tablo: 'giderler' })),
    ].sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
    setIslemler(birlesik)
    setYukleniyor(false)
  }, [donem])

  useEffect(() => { yukle() }, [yukle])

  const DONEMLER = donemListesi()

  const sil = async (tablo, id) => {
    if (!confirm('Bu işlem silinsin mi?')) return
    // Silinecek kaydı bul
    const kayit = islemler.find(r => r._tablo === tablo && r.id === id)
    // Ana kaydı sil
    await supabase.from(tablo).delete().eq('id', id)
    // grup_id varsa birikim_hareketler'deki eşini de sil
    if (kayit?.grup_id) {
      await supabase.from('birikim_hareketler').delete().eq('grup_id', kayit.grup_id)
    }
    yukle()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
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

      {yukleniyor ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : islemler.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Bu dönemde işlem yok.</div>
      ) : (
        <div className="space-y-2">
          {islemler.map(r => (
            <div key={`${r._tablo}-${r.id}`}
              className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${r._tur === 'gelir' ? 'bg-green-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{r.kategori}</span>
                  {r.aciklama && <span className="text-xs text-slate-400 truncate">{r.aciklama}</span>}
                </div>
                <p className="text-xs text-slate-400">{new Date(r.tarih).toLocaleDateString('tr-TR')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${r._tur === 'gelir' ? 'text-green-600' : 'text-red-500'}`}>
                  {r._tur === 'gelir' ? '+' : '-'}₺{formatPara(r.k)}
                </p>
                <span className="text-xs text-slate-400">{r.hesap === 'N' ? '💵 Nakit' : '🏦 Banka'}</span>
              </div>
              <button onClick={() => sil(r._tablo, r.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {form && <IslemFormu tur={form} donem={donem} onKapat={() => setForm(null)} onKayit={yukle} />}
    </div>
  )
}
