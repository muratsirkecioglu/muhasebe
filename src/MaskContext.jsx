import { createContext, useContext, useState } from 'react'

const MaskContext = createContext()

export function MaskProvider({ children }) {
  const [maskeli, setMaskeli] = useState(false)
  const toggleMask = () => setMaskeli(m => !m)
  return (
    <MaskContext.Provider value={{ maskeli, toggleMask }}>
      {children}
    </MaskContext.Provider>
  )
}

export function useMask() {
  return useContext(MaskContext)
}
