import { useState } from 'react'
import Hesap from './Hesap'
import Islemler from './Islemler'

// Hesap ve İşlemler aynı anda yüklenir; her ikisi hazır olana kadar
// tek bir spinner gösterilir — ayrı ayrı yükleme ekranı çıkmaz.
export default function HesapIslemler() {
  const [hazir, setHazir] = useState({ hesap: false, islemler: false })
  const [refreshKey, setRefreshKey] = useState(0)
  const tumunuHazir = hazir.hesap && hazir.islemler

  return (
    <div>
      {!tumunuHazir && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <Hesap    onHazir={() => setHazir(h => ({ ...h, hesap: true }))} refreshKey={refreshKey} />
      {tumunuHazir && <div className="border-t border-slate-100 mx-4 md:mx-6" />}
      <Islemler onHazir={() => setHazir(h => ({ ...h, islemler: true }))} onKayitDegisti={() => setRefreshKey(k => k + 1)} />
    </div>
  )
}
