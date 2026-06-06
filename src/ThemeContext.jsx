import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [gece, setGece] = useState(() => localStorage.getItem('gece') === 'true')

  useEffect(() => {
    if (gece) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [gece])

  const toggleGece = () => setGece(g => {
    const yeni = !g
    localStorage.setItem('gece', String(yeni))
    return yeni
  })

  return (
    <ThemeContext.Provider value={{ gece, toggleGece }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
