const VIEWS = ['front', 'back', 'side']

const PRINT_RECT = {
  front: { x: 120, y: 128, width: 60, height: 74 },
  back: { x: 112, y: 116, width: 76, height: 84 },
  side: { x: 100, y: 140, width: 28, height: 56 },
}

const NECKLINE = {
  front: 'Q150,58 182,26',
  back: 'Q150,40 182,26',
  side: 'Q150,58 182,26',
}

function shade(hex, percent) {
  const clean = (hex || '#8b8f98').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = Number.parseInt(full, 16)
  if (Number.isNaN(num)) return hex || '#8b8f98'
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`
}

export default function TshirtPreview({ hex, view = 'front', design, label, onChangeView, availableViews }) {
  const fill = hex || '#3a3d44'
  const shirtId = `shirt-${view}`
  const rect = PRINT_RECT[view]
  const isPdf = design?.file_type === 'pdf'
  const isImage = design && !isPdf

  return (
    <div className="relative w-full max-w-sm aspect-square mx-auto bg-panel border border-panel-2 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 screentone opacity-40" />

      <svg viewBox="0 0 300 320" className="relative w-4/5 h-4/5" role="img" aria-label={`${view} t-shirt preview${hex ? ` in ${hex}` : ''}`}>
        <defs>
          <linearGradient id={`${shirtId}-shade`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={shade(fill, 18)} />
            <stop offset="45%" stopColor={fill} />
            <stop offset="100%" stopColor={shade(fill, -16)} />
          </linearGradient>
          <clipPath id={`${shirtId}-print`}>
            <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="3" />
          </clipPath>
        </defs>

        <path
          d={`M28,100 L52,58 Q72,40 95,26 L118,26 ${NECKLINE[view]} L205,26 Q228,40 248,58 L272,100 L228,124 L204,108 L204,296 L96,296 L96,108 L72,124 Z`}
          fill={`url(#${shirtId}-shade)`}
          stroke={shade(fill, -30)}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* collar rib */}
        <path
          d={view === 'back' ? 'M118,26 Q150,40 182,26 L178,32 Q150,46 122,32 Z' : 'M118,26 Q150,58 182,26 L176,34 Q150,50 124,34 Z'}
          fill={shade(fill, -22)}
        />

        {/* seams for fabric realism */}
        <path d="M96,108 L96,296 M204,108 L204,296" stroke={shade(fill, -12)} strokeWidth="1" strokeDasharray="4 5" opacity="0.55" />
        <path d="M52,58 L72,124 M248,58 L228,124" stroke={shade(fill, -12)} strokeWidth="1" opacity="0.4" />

        {/* print area guide / uploaded design */}
        {isImage ? (
          <g clipPath={`url(#${shirtId}-print)`}>
            <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="#f5f4f0" opacity="0.08" />
            <image
              href={design.file_url}
              x={rect.x} y={rect.y} width={rect.width} height={rect.height}
              preserveAspectRatio="xMidYMid meet"
              style={{ mixBlendMode: 'multiply' }}
            />
          </g>
        ) : isPdf ? (
          <g>
            <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="3" fill="none" stroke="var(--color-acid)" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} textAnchor="middle" fill="var(--color-acid)" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="1">PDF FILE</text>
          </g>
        ) : (
          <g>
            <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="3" fill="none" stroke="var(--color-paper)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} textAnchor="middle" fill="var(--color-paper)" fontFamily="JetBrains Mono, monospace" fontSize="7.5" letterSpacing="1.5" opacity="0.6">
              {view.toUpperCase()} PRINT
            </text>
          </g>
        )}
      </svg>

      {availableViews && availableViews.length > 1 && (
        <div className="absolute top-3 right-3 flex gap-1">
          {VIEWS.filter((v) => availableViews.includes(v)).map((v) => (
            <button key={v} type="button" onClick={() => onChangeView?.(v)}
              className={`px-2 py-1 font-mono text-[9px] uppercase tracking-widest border transition-colors ${v === view ? 'border-acid text-acid bg-acid/10' : 'border-panel-2 text-slate hover:border-paper'}`}>
              {v}
            </button>
          ))}
        </div>
      )}

      <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-widest text-slate">{label || `${view} preview`}</span>
    </div>
  )
}
