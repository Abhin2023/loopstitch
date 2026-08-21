const DEFAULT_ITEMS = [
  'LIMITED BATCH — 100 PIECES',
  'DTF PRINTED · MADE TO ORDER',
  'ANIME × STREETWEAR',
  'FREE SHIPPING OVER ₹1499',
  'DROP 001 NOW LIVE',
]

export default function Marquee({ items = DEFAULT_ITEMS, className = '' }) {
  const loop = [...items, ...items]
  return (
    <div className={`overflow-hidden border-y border-panel-2 bg-panel py-2.5 ${className}`} aria-hidden="true">
      <div className="marquee-track">
        {loop.map((text, i) => (
          <span
            key={i}
            className="font-mono text-xs sm:text-sm tracking-widest text-paper/80 whitespace-nowrap px-6 flex items-center gap-6"
          >
            {text}
            <span className="text-riot">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
