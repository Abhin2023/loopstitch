import { useState } from 'react'

export default function ColorSizePicker({ colors, sizes, selections, setSelections, minQty }) {
  const [activeColor, setActiveColor] = useState(null)

  const toggleColor = (colorId) => {
    const existing = selections.find((s) => s.color_id === colorId)
    if (existing) {
      setSelections(selections.filter((s) => s.color_id !== colorId))
      if (activeColor === colorId) {
        const remaining = selections.filter((s) => s.color_id !== colorId)
        setActiveColor(remaining.length > 0 ? remaining[0].color_id : null)
      }
    } else {
      setSelections([...selections, { color_id: colorId, sizes: sizes.map((s) => ({ size: s, quantity: 0 })) }])
      setActiveColor(colorId)
    }
  }

  const updateQuantity = (colorId, size, qty) => {
    const q = Math.max(0, qty)
    setSelections(selections.map((sel) =>
      sel.color_id === colorId
        ? { ...sel, sizes: sel.sizes.map((s) => s.size === size ? { ...s, quantity: q } : s) }
        : sel
    ))
  }

  const totalPieces = selections.reduce((sum, sel) => sum + sel.sizes.reduce((s, sz) => s + sz.quantity, 0), 0)
  const selectedColorIds = selections.map((s) => s.color_id)
  const activeSelection = selections.find((s) => s.color_id === activeColor)

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-widest text-acid mb-6">Select colors & sizes</h2>

      {/* Color swatches */}
      <div className="mb-8">
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-3">Available colors</span>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => {
            const isSelected = selectedColorIds.includes(c.id)
            const isActive = activeColor === c.id
            return (
              <button key={c.id} onClick={() => toggleColor(c.id)}
                className={`relative w-12 h-12 rounded-full border-2 transition-all ${isActive ? 'border-acid scale-110' : isSelected ? 'border-paper' : 'border-panel-2 hover:border-acid/50'}`}
                title={c.name}>
                <span className="absolute inset-1 rounded-full" style={{ backgroundColor: c.hex_code }} />
                {isSelected && <span className="absolute -top-1 -right-1 w-4 h-4 bg-acid rounded-full flex items-center justify-center text-ink text-[10px] font-bold">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Size grid for active color */}
      {activeSelection && (
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-3">
            Sizes for {colors.find((c) => c.id === activeColor)?.name}
          </span>
          <div className="grid grid-cols-5 gap-3">
            {sizes.map((size) => {
              const sizeData = activeSelection.sizes.find((s) => s.size === size)
              const qty = sizeData?.quantity || 0
              return (
                <div key={size} className="border border-panel-2 p-3 text-center">
                  <span className="font-mono text-xs text-paper block mb-2">{size}</span>
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => updateQuantity(activeColor, size, qty - 1)}
                      className="w-7 h-7 border border-panel-2 text-slate hover:border-acid hover:text-acid font-mono text-sm transition-all">−</button>
                    <span className="font-mono text-sm text-paper w-6 text-center">{qty}</span>
                    <button type="button" onClick={() => updateQuantity(activeColor, size, qty + 1)}
                      className="w-7 h-7 border border-panel-2 text-slate hover:border-acid hover:text-acid font-mono text-sm transition-all">+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-8 p-4 border border-panel-2">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate">Total pieces</span>
          <span className={`font-mono text-sm ${totalPieces >= minQty ? 'text-acid' : 'text-riot'}`}>
            {totalPieces} / {minQty} min
          </span>
        </div>
        {selections.length > 0 && (
          <div className="mt-3 space-y-1">
            {selections.map((sel) => {
              const colorName = colors.find((c) => c.id === sel.color_id)?.name
              const colorTotal = sel.sizes.reduce((s, sz) => s + sz.quantity, 0)
              return colorTotal > 0 ? (
                <div key={sel.color_id} className="flex justify-between font-mono text-[11px] text-slate">
                  <span>{colorName}</span>
                  <span>{colorTotal} pieces</span>
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
    </div>
  )
}
