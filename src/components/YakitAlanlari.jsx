// Akaryakıt gideri + araç seçiliyken gösterilen dolum alanları.
// km = dolum anındaki sayaç değeri, litre = alınan yakıt, tam_depo = depo
// tam mı dolduruldu. Tüketim hesabı (bkz. db.js/yakitTuketimi) tam depo
// noktalarını referans aldığı için bu bayrak doğruluğu belirler.
export default function YakitAlanlari({ km, litre, tamDepo, onDegis, compact = false }) {
  const girisCls = compact
    ? 'w-full text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none text-right'
    : 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  const sayi = (deger, tamsayi) => {
    if (deger === '') return null
    const n = tamsayi ? parseInt(deger) : parseFloat(deger)
    return isNaN(n) ? null : n
  }

  const depoDolu = tamDepo !== false
  const depoBtn = (
    <button type="button" onClick={() => onDegis('tam_depo', !depoDolu)}
      title="Depo tam dolduruldu mu? Tüketim hesabı tam depolar arasında yapılır"
      className={`flex-shrink-0 rounded-lg border font-medium transition-colors ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-2.5 text-xs'
      } ${depoDolu ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
      {depoDolu ? '⛽ Tam depo' : 'Eksik dolum'}
    </button>
  )

  if (compact) {
    return (
      <div className="flex gap-1 items-center">
        <input type="number" min="0" step="1" value={km ?? ''} placeholder="km"
          onChange={e => onDegis('km', sayi(e.target.value, true))} className={girisCls} />
        <input type="number" min="0" step="0.01" value={litre ?? ''} placeholder="litre"
          onChange={e => onDegis('litre', sayi(e.target.value, false))} className={girisCls} />
        {depoBtn}
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">Dolum (isteğe bağlı)</label>
      <div className="flex gap-2 items-stretch">
        <input type="number" min="0" step="1" value={km ?? ''} placeholder="Kilometre"
          onChange={e => onDegis('km', sayi(e.target.value, true))} className={girisCls} />
        <input type="number" min="0" step="0.01" value={litre ?? ''} placeholder="Litre"
          onChange={e => onDegis('litre', sayi(e.target.value, false))} className={girisCls} />
        {depoBtn}
      </div>
      <p className="text-xs text-slate-400 mt-1">Tüketim ortalaması km ve litre girilen dolumlardan çıkar</p>
    </div>
  )
}
