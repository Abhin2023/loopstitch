const VIEWS = ['front', 'back', 'side']

const PRINT_RECT = {
  front: { x: 120, y: 132, width: 60, height: 74 },
  back: { x: 112, y: 118, width: 76, height: 84 },
  side: { x: 100, y: 144, width: 28, height: 56 },
}

const NECKLINE = {
  front: 'C120,44 132,54 150,54 C168,54 180,44 182,28',
  back: 'C122,38 134,42 150,42 C166,42 178,38 182,28',
  side: 'C120,44 132,54 150,54 C168,54 180,44 182,28',
}

const COLLAR = {
  front: 'M118,28 C120,44 132,54 150,54 C168,54 180,44 182,28 C180,41 168,48 150,48 C132,48 120,41 118,28 Z',
  back: 'M118,28 C122,38 134,42 150,42 C166,42 178,38 182,28 C179,36 167,40 150,40 C133,40 121,36 118,28 Z',
  side: 'M118,28 C120,44 132,54 150,54 C168,54 180,44 182,28 C180,41 168,48 150,48 C132,48 120,41 118,28 Z',
}

const BODY_PATH = 'M34,96 C34,84 40,74 46,64 C54,50 74,34 94,26 L118,28 {neck} L206,26 C226,34 246,50 254,64 C260,74 266,84 266,96 C266,104 260,110 250,116 L226,120 C222,111 214,112 204,113 L204,290 C204,296 200,300 196,300 L104,300 C100,300 96,296 96,290 L96,113 C86,112 78,111 74,120 L50,116 C40,110 34,104 34,96 Z'

function shirtPath(view) {
  return BODY_PATH.replace('{neck}', NECKLINE[view])
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
  const views = VIEWS.filter((v) => (availableViews || ['front']).includes(v))

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative aspect-square bg-panel border border-panel-2 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 screentone opacity-40" />

        <svg viewBox="0 0 300 340" className="relative w-4/5 h-4/5" role="img" aria-label={`${view} t-shirt preview${hex ? ` in ${hex}` : ''}`}>
          <defs>
            <linearGradient id={`${shirtId}-shade`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={shade(fill, 20)} />
              <stop offset="42%" stopColor={fill} />
              <stop offset="100%" stopColor={shade(fill, -18)} />
            </linearGradient>
            <radialGradient id={`${shirtId}-shadow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${shirtId}-body`}>
              <path d={shirtPath(view)} />
            </clipPath>
            <clipPath id={`${shirtId}-print`}>
              <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="3" />
            </clipPath>
            <filter id={`${shirtId}-grain`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
            </filter>
          </defs>

          {/* ground shadow */}
          <ellipse cx="150" cy="316" rx="88" ry="13" fill={`url(#${shirtId}-shadow)`} />

          {/* garment body */}
          <path d={shirtPath(view)} fill={`url(#${shirtId}-shade)`} stroke={shade(fill, -32)} strokeWidth="2" strokeLinejoin="round" />

          <g clipPath={`url(#${shirtId}-body)`}>
            {/* fabric grain */}
            <rect x="0" y="0" width="300" height="340" filter={`url(#${shirtId}-grain)`} style={{ mixBlendMode: 'overlay' }} />
            {/* sheen highlight, upper chest */}
            <ellipse cx="112" cy="82" rx="58" ry="78" fill="#ffffff" opacity="0.16" style={{ filter: 'blur(10px)', mixBlendMode: 'soft-light' }} />
            {/* underarm + waist fold shadows */}
            <path d="M96,120 Q106,160 96,200" fill="none" stroke={shade(fill, -20)} strokeWidth="10" strokeLinecap="round" opacity="0.18" style={{ filter: 'blur(4px)' }} />
            <path d="M204,120 Q194,160 204,200" fill="none" stroke={shade(fill, -20)} strokeWidth="10" strokeLinecap="round" opacity="0.18" style={{ filter: 'blur(4px)' }} />
          </g>

          {/* collar rib */}
          <path d={COLLAR[view]} fill={shade(fill, -24)} />
          <path
            d={view === 'back' ? 'M122,32 C130,38 140,40 150,40' : 'M124,34 C134,44 142,48 150,48'}
            fill="none" stroke={shade(fill, 14)} strokeWidth="1" opacity="0.4"
          />

          {/* seams for fabric realism */}
          <path d="M96,113 L96,290 M204,113 L204,290" stroke={shade(fill, -14)} strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.6" />
          <path d="M46,64 L74,120 M254,64 L226,120" stroke={shade(fill, -14)} strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.45" />
          {/* hem + cuff stitching */}
          <path d="M100,294 L200,294" stroke={shade(fill, -14)} strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.5" />
          <path d="M38,90 Q42,80 48,68" stroke={shade(fill, -14)} strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.5" />
          <path d="M262,90 Q258,80 252,68" stroke={shade(fill, -14)} strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.5" />

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
      </div>

      <div className="flex items-center justify-between gap-3 mt-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate truncate">{label || `${view} preview`}</span>
        {views.length > 1 && (
          <div className="grid grid-flow-col auto-cols-fr gap-1.5 shrink-0">
            {views.map((v) => (
              <button key={v} type="button" onClick={() => onChangeView?.(v)}
                className={`px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest border transition-colors ${v === view ? 'border-acid text-acid bg-acid/10' : 'border-panel-2 text-slate hover:border-paper'}`}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
