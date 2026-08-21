import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import client, { mediaUrl } from '../api/client'
import { useCart } from '../context/CartContext'
import { formatINR } from '../utils/format'
import SizePicker from '../components/SizePicker'
import Loader from '../components/Loader'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    client
      .get(`/api/products/${slug}`)
      .then((res) => {
        setProduct(res.data)
        setActiveImage(0)
        setSelectedSize(null)
        setQuantity(1)
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  if (loading) return <Loader label="Loading product" />
  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="font-mono text-slate mb-4">This product doesn't exist or was removed.</p>
        <Link to="/shop" className="text-acid font-mono text-xs uppercase tracking-widest">← Back to shop</Link>
      </div>
    )
  }

  const images = product.images || []
  const sizes = product.sizes || []
  const sizeRow = sizes.find((s) => s.size === selectedSize)
  const maxForSize = sizeRow?.stock ?? 0
  const totalStock = product.total_stock

  const handleAdd = () => {
    if (!selectedSize || maxForSize < 1) return
    addItem(product, selectedSize, quantity, maxForSize)
    setJustAdded(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setJustAdded(false), 1800)
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
      <button onClick={() => navigate(-1)} className="font-mono text-xs text-slate hover:text-paper mb-8 uppercase tracking-widest">
        ← Back
      </button>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/5] bg-panel overflow-hidden mb-3">
            <AnimatePresence mode="wait">
              {images.length > 0 ? (
                <motion.img
                  key={activeImage}
                  src={mediaUrl(images[activeImage]?.url)}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-dim font-mono text-xs">NO IMAGE</div>
              )}
            </AnimatePresence>
            {totalStock === 0 && (
              <span className="sticker absolute top-4 left-4 bg-ink border border-riot text-riot text-xs font-mono font-bold px-3 py-1.5 uppercase tracking-wider">
                Sold Out
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border ${i === activeImage ? 'border-acid' : 'border-panel-2'}`}
                >
                  <img src={mediaUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.colorway && <p className="font-mono text-xs text-slate uppercase tracking-widest mb-2">{product.colorway}</p>}
          <h1 className="font-display text-3xl sm:text-4xl uppercase text-paper leading-tight mb-3">{product.name}</h1>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xl text-paper">{formatINR(product.price)}</span>
            {product.compare_at_price > 0 && (
              <span className="font-mono text-sm text-slate-dim line-through">{formatINR(product.compare_at_price)}</span>
            )}
          </div>

          {product.description && (
            <p className="text-paper/70 text-sm leading-relaxed mb-8 max-w-md">{product.description}</p>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-slate">Size</span>
              {selectedSize && (
                <span className="font-mono text-xs text-slate">
                  {maxForSize > 0 ? `${maxForSize} in stock` : 'Locked — sold out'}
                </span>
              )}
            </div>
            <SizePicker sizes={sizes} selected={selectedSize} onSelect={setSelectedSize} />
          </div>

          {selectedSize && maxForSize > 0 && (
            <div className="mb-8">
              <span className="font-mono text-xs uppercase tracking-widest text-slate block mb-3">Quantity</span>
              <div className="flex items-center border border-panel-2 w-fit">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 font-mono text-paper hover:text-acid"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono text-paper">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxForSize, q + 1))}
                  className="w-10 h-10 font-mono text-paper hover:text-acid"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!selectedSize || maxForSize < 1}
            className={`w-full sm:w-auto px-10 py-4 font-mono text-sm uppercase tracking-widest transition-colors ${
              !selectedSize || maxForSize < 1
                ? 'bg-panel-2 text-slate-dim cursor-not-allowed'
                : justAdded
                  ? 'bg-acid text-ink'
                  : 'bg-riot text-ink hover:bg-acid'
            }`}
          >
            {!selectedSize ? 'Select a size' : maxForSize < 1 ? 'Locked — sold out' : justAdded ? 'Added ✓' : 'Add to cart'}
          </button>

          <div className="mt-10 pt-6 border-t border-panel-2 text-xs text-slate space-y-1.5 font-mono">
            <p>· DTF print, 240 GSM heavyweight cotton</p>
            <p>· Ships in 3–5 business days from Bengaluru</p>
            <p>· Limited batch — sizes lock permanently once sold</p>
          </div>
        </div>
      </div>
    </div>
  )
}
