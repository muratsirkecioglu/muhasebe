import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Araç listesi çok nadir değişir (yeni alım / satış) — her gider formunun ayrı
// sorgu atmaması için modül düzeyinde önbelleğe alınır. Araç sayfası ekleme /
// satış / düzenleme yaptığında aracCacheTemizle() ile geçersiz kılar.
let _cache = null
let _bekleyen = null

export function aracCacheTemizle() {
  _cache = null
  _bekleyen = null
}

export async function araclariGetir() {
  if (_cache) return _cache
  if (!_bekleyen) {
    _bekleyen = supabase.from('araclar')
      .select('id, ad, plaka, emoji, aktif, alis_tarihi, satis_tarihi')
      .order('sira', { nullsFirst: false })
      .order('id')
      .then(({ data }) => { _cache = data || []; _bekleyen = null; return _cache })
  }
  return _bekleyen
}

export function useAraclar() {
  const [araclar, setAraclar] = useState([])
  useEffect(() => {
    let iptal = false
    araclariGetir().then(a => { if (!iptal) setAraclar(a) })
    return () => { iptal = true }
  }, [])
  return araclar
}

export function aracEtiket(a) {
  if (!a) return ''
  return `${a.emoji ? a.emoji + ' ' : ''}${a.ad}${a.aktif ? '' : ' (satıldı)'}`
}

// Araç seçici. Hiç araç yoksa (ya da hepsi satılmışsa) HİÇ RENDER EDİLMEZ —
// "varsa araçla ilişkilendir" davranışı. Satılmış araçlar listede yer almaz,
// ancak düzenlenen kayıt zaten o araca bağlıysa korunur ki geçmiş kayıtların
// bağı düzenleme sırasında sessizce kopmasın.
export default function AracSecici({ value, onChange, label, className = '', bos = '— Araçla ilişkilendirme —' }) {
  const araclar = useAraclar()
  const secenekler = araclar.filter(a => a.aktif || String(a.id) === String(value ?? ''))
  if (secenekler.length === 0) return null

  const select = (
    <select value={value ?? ''} onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
      className={className}>
      <option value="">{bos}</option>
      {secenekler.map(a => <option key={a.id} value={a.id}>{aracEtiket(a)}</option>)}
    </select>
  )

  if (!label) return select
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
      {select}
    </div>
  )
}
