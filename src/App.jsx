import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Users, Upload, Car, LogOut, BookOpen } from 'lucide-react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from './supabase'
import Dashboard from './pages/Dashboard'
import Islemler from './pages/Islemler'
import Birikim from './pages/Birikim'
import BorcAlacak from './pages/BorcAlacak'
import Import from './pages/Import'
import AracMasraf from './pages/AracMasraf'
import Login from './pages/Login'
import Hesap from './pages/Hesap'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hesap', icon: BookOpen, label: 'Hesap' },
  { to: '/islemler', icon: ArrowLeftRight, label: 'İşlemler' },
  { to: '/birikim', icon: PiggyBank, label: 'Birikim' },
  { to: '/borc', icon: Users, label: 'Borç/Alacak' },
  { to: '/arac', icon: Car, label: 'Araç' },
  { to: '/import', icon: Upload, label: 'Import' },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function SideNav() {
  const { user } = useAuth()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 fixed top-0 left-0 bottom-0">
      <div className="px-4 py-5 border-b border-slate-100">
        <h1 className="text-lg font-bold text-blue-700">💰 Muhasebe</h1>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email}</p>
      </div>
      <nav className="flex flex-col p-3 gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 w-full"
        >
          <LogOut size={18} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}

function AppShell() {
  const { user } = useAuth()

  // Oturum yüklenene kadar bekle
  if (user === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Giriş yapılmamışsa login sayfası
  if (user === null) {
    return <Login />
  }

  return (
    <HashRouter>
      <div className="flex min-h-dvh">
        <SideNav />
        <main className="flex-1 md:ml-56 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hesap" element={<Hesap />} />
            <Route path="/islemler" element={<Islemler />} />
            <Route path="/birikim" element={<Birikim />} />
            <Route path="/borc" element={<BorcAlacak />} />
            <Route path="/arac" element={<AracMasraf />} />
            <Route path="/import" element={<Import />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
