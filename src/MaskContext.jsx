import { createContext, useContext, useState } from 'react'

const MaskContext = createContext()

export function MaskProvider({ children }) {
  const [maskeli, setMaskeli] = useState(() => localStorage.getItem('maskeli') === 'true')
  const toggleMask = () => setMaskeli(m => {
    localStorage.setItem('maskeli', String(!m))
    return !m
  })
  return (
    <MaskContext.Provider value={{ maskeli, toggleMask }}>
      {children}
    </MaskContext.Provider>
  )
}

export function useMask() {
  return useContext(MaskContext)
}
