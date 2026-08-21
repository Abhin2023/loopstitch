import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { mediaUrl } from '../api/client'
import { formatINR } from '../utils/format'

export default function ProductCard({ product, index = 0 }) {
  const primaryImage = product.images?.[0]?.url
  const secondaryImage = product.images?.[1]?.url
  const totalStock = product.total_stock ?? 0
  const isSoldOut = totalStock === 0
  const isLowStock = totalStock > 0 && totalStock <= 6

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.06 }}
    >
      <Link to={`/product/${product.slug}`} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden bg-panel">
          {primaryImage ? (
            <img
              src={mediaUrl(primaryImage)}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-dim font-mono text-xs">NO IMAGE</div>
          )}
          {secondaryImage && (
            <img
              src={mediaUrl(secondaryImage)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 screentone-red screentone opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500" />

          {product.is_featured && !isSoldOut && (
            <span className="sticker absolute top-3 left-3 bg-acid text-ink text-[10px] font-mono font-bold px-2 py-1 uppercase tracking-wider">
              Limited
            </span>
          )}
          {isSoldOut && (
            <span className="sticker absolute top-3 left-3 bg-ink border border-riot text-riot text-[10px] font-mono font-bold px-2 py-1 uppercase tracking-wider">
              Sold Out
            </span>
          )}
          {isLowStock && !isSoldOut && (
            <span className="absolute bottom-3 left-3 bg-ink/80 backdrop-blur text-acid text-[10px] font-mono px-2 py-1 uppercase tracking-wider">
              Only {totalStock} left
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-body font-medium text-paper text-sm sm:text-base leading-snug">{product.name}</h3>
            {product.colorway && <p className="font-mono text-[11px] text-slate mt-0.5 uppercase">{product.colorway}</p>}
          </div>
          <div className="text-right shrink-0 font-mono">
            <span className="text-paper text-sm">{formatINR(product.price)}</span>
            {product.compare_at_price && (
              <span className="block text-slate-dim text-[11px] line-through">{formatINR(product.compare_at_price)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
