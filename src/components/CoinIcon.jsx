export default function CoinIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dış halka */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      {/* İç halka */}
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1" />
      {/* M harfi */}
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        fill="currentColor"
      >
        M
      </text>
    </svg>
  )
}
