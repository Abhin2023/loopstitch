export default function SizePicker({ sizes, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((s) => {
        const isOut = s.stock === 0
        const isSelected = selected === s.size
        return (
          <button
            key={s.id}
            type="button"
            disabled={isOut}
            onClick={() => onSelect(s.size)}
            aria-pressed={isSelected}
            className={`relative w-14 h-12 font-mono text-sm border transition-all
              ${isOut
                ? 'border-panel-2 text-slate-dim cursor-not-allowed line-through overflow-hidden'
                : isSelected
                  ? 'border-acid text-acid bg-acid/10'
                  : 'border-panel-2 text-paper hover:border-paper'}`}
          >
            {s.size}
            {isOut && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-[8px] tracking-wider font-mono not-italic">
                LOCKED
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
