import Hesap from './Hesap'
import Islemler from './Islemler'

export default function HesapIslemler() {
  return (
    <div>
      <Hesap />
      <div className="border-t border-slate-100 mx-4 md:mx-6" />
      <Islemler />
    </div>
  )
}
