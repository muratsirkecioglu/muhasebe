import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  const girisYap = async (e) => {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) {
      setHata('E-posta veya şifre hatalı.')
      setYukleniyor(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-xl font-bold text-slate-800">Kişisel Muhasebe</h1>
          <p className="text-sm text-slate-400 mt-1">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={girisYap} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Şifre</label>
            <input
              type="password"
              value={sifre}
              onChange={e => setSifre(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              autoComplete="current-password"
            />
          </div>

          {hata && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60 mt-2"
          >
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
