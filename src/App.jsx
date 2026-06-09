import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut, BookOpen, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import CoinIcon from './components/CoinIcon'
import { AuthProvider, useAuth } from './AuthContext'
import { MaskProvider, useMask } from './MaskContext'
import { ThemeProvider, useTheme } from './ThemeContext'
import { supabase } from './supabase'
import DashboardProj from './pages/DashboardProj'
import HesapIslemler from './pages/HesapIslemler'
import Birikim from './pages/Birikim'
import BorcAlacak from './pages/BorcAlacak'
import Login from './pages/Login'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hesap', icon: BookOpen, label: 'Hesap' },
  { to: '/birikim', icon: CoinIcon, label: 'Birikim' },
  { to: '/borc', icon: Users, label: 'Borç/Alacak' },
]

function BottomNav() {
  const { maskeli, toggleMask } = useMask()
  const { gece, toggleGece } = useTheme()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50 md:hidden">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={toggleMask}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
            maskeli ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {maskeli ? <EyeOff size={20} /> : <Eye size={20} />}
          <span>{maskeli ? 'Maskeli' : 'Görünür'}</span>
        </button>
        <button
          onClick={toggleGece}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
            gece ? 'text-yellow-400' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {gece ? <Sun size={20} /> : <Moon size={20} />}
          <span>{gece ? 'Gece' : 'Gündüz'}</span>
        </button>
      </div>
    </nav>
  )
}

function SideNav() {
  const { user } = useAuth()
  const { maskeli, toggleMask } = useMask()
  const { gece, toggleGece } = useTheme()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 fixed top-0 left-0 bottom-0">
      <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-700">
        <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">💰 Muhasebe</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user?.email}</p>
      </div>
      <nav className="flex flex-col p-3 gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
        <button
          onClick={toggleGece}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors ${
            gece
              ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {gece ? <Sun size={18} /> : <Moon size={18} />}
          Gece Modu
        </button>
        <button
          onClick={toggleMask}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors ${
            maskeli
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {maskeli ? <EyeOff size={18} /> : <Eye size={18} />}
          {maskeli ? 'Maskeleme Açık' : 'Maskeleme'}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 w-full"
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

  if (user === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user === null) {
    return <Login />
  }

  return (
    <HashRouter>
      <div className="flex min-h-dvh dark:bg-slate-900">
        <SideNav />
        <main className="flex-1 md:ml-56 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<DashboardProj />} />
            <Route path="/hesap" element={<HesapIslemler />} />
            <Route path="/birikim" element={<Birikim />} />
            <Route path="/borc" element={<BorcAlacak />} />
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
      <ThemeProvider>
        <MaskProvider>
          <AppShell />
        </MaskProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
