import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '../api/client'
import ProductCard from '../components/ProductCard'
import Loader from '../components/Loader'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'tshirt', label: 'Tees' },
  { value: 'hoodie', label: 'Hoodies' },
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    client
      .get('/api/products', { params: category ? { category } : {} })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <div className="mb-10">
        <p className="font-mono text-xs text-riot tracking-widest uppercase mb-2">Full catalog</p>
        <h1 className="font-display text-4xl sm:text-5xl uppercase text-paper">Shop</h1>
      </div>

      <div className="flex gap-3 mb-10 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setSearchParams(c.value ? { category: c.value } : {})}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
              category === c.value ? 'border-acid text-acid' : 'border-panel-2 text-slate hover:text-paper'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Loading catalog" />
      ) : products.length === 0 ? (
        <div className="text-center py-24 text-slate font-mono text-sm">
          Nothing here yet. Check back for the next drop.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
