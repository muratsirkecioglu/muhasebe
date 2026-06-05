import { useState, useEffect } from 'react'

function isoToDisplay(iso) {
  if (!iso) return ''
  const date = String(iso).split('T')[0]
  const parts = date.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

function displayToISO(display) {
  const m = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export default function TarihInput({ value, onChange, className = '', required = false }) {
  const [text, setText] = useState(isoToDisplay(value))

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const handleChange = (e) => {
    // Sadece rakam ve noktaya izin ver
    let raw = e.target.value.replace(/[^\d.]/g, '')

    // Rakamları çek, noktaları sil
    const digits = raw.replace(/\./g, '')

    // Otomatik nokta ekle
    let formatted
    if (digits.length <= 2) {
      formatted = digits
    } else if (digits.length <= 4) {
      formatted = digits.slice(0, 2) + '.' + digits.slice(2)
    } else {
      formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4, 8)
    }

    setText(formatted)

    const iso = displayToISO(formatted)
    if (iso) onChange(iso)
  }

  const gecerli = !text || displayToISO(text) !== null

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      placeholder="GG.AA.YYYY"
      inputMode="numeric"
      maxLength={10}
      required={required}
      className={`${className} ${!gecerli ? 'border-red-300 focus:ring-red-300' : ''}`}
    />
  )
}
