import { yerelTarih } from '../db'

function toDateValue(v) {
  if (!v) return ''
  if (String(v).includes('T')) return yerelTarih(v) || String(v).split('T')[0]
  return v
}

export default function TarihInput({ value, onChange, className = '', required = false }) {
  return (
    <input
      type="date"
      value={toDateValue(value)}
      onChange={e => onChange(e.target.value)}
      required={required}
      className={className}
    />
  )
}
