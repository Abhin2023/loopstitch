import { formatINR } from '../../utils/format'
import Loader from '../Loader'

export default function PriceSummary({ quote, quoteLoading, totalPieces }) {
  if (quoteLoading) return <Loader label="Calculating price" />
  if (!quote) return null

  return (
    <div className="border border-panel-2 p-6 space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Order summary</h2>

      <div className="space-y-2">
        <div className="flex justify-between font-mono text-xs text-slate">
          <span>{totalPieces} pieces × {formatINR(quote.base_price)} each</span>
          <span>{formatINR(quote.subtotal)}</span>
        </div>

        {quote.discount_percent > 0 && (
          <div className="flex justify-between font-mono text-xs text-acid">
            <span>Volume discount ({quote.discount_percent}%)</span>
            <span>−{formatINR(quote.discount_amount)}</span>
          </div>
        )}

        <div className="flex justify-between font-mono text-xs text-slate">
          <span>Shipping</span>
          <span>{quote.shipping_fee === 0 ? 'FREE' : formatINR(quote.shipping_fee)}</span>
        </div>
      </div>

      <div className="border-t border-panel-2 pt-4 flex justify-between items-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate">Total</span>
        <span className="font-display text-2xl text-paper">{formatINR(quote.total)}</span>
      </div>

      {quote.discount_percent > 0 && (
        <p className="font-mono text-[11px] text-acid">You save {formatINR(quote.discount_amount)} with volume pricing!</p>
      )}
    </div>
  )
}
