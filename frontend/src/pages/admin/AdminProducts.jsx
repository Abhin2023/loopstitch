import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { mediaUrl } from '../../api/client'
import { formatINR } from '../../utils/format'
import Loader from '../../components/Loader'

export default function AdminProducts() {
  const [products, setProducts] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    client.get('/api/admin/products').then((res) => setProducts(res.data)).catch(() => setError('Failed to load products'))
  }

  useEffect(load, [])

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return
    try {
      await client.delete(`/api/admin/products/${product.id}`)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch {
      alert('Failed to delete product.')
    }
  }

  if (error) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!products) return <Loader label="Loading products" />

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl uppercase text-paper">Products</h1>
        <Link to="/admin/products/new" className="bg-riot text-ink font-mono text-xs uppercase tracking-widest px-5 py-2.5 hover:bg-acid transition-colors">
          + Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="font-mono text-sm text-slate">No products yet. Add your first one.</p>
      ) : (
        <div className="border border-panel-2 divide-y divide-panel-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <div className="w-14 h-16 bg-panel shrink-0 overflow-hidden">
                {p.images?.[0] && <img src={mediaUrl(p.images[0].url)} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-paper text-sm truncate">{p.name}</p>
                <p className="font-mono text-[11px] text-slate mt-0.5">
                  {formatINR(p.price)} · stock {p.total_stock} · {p.is_active ? 'active' : 'hidden'} {p.is_featured && '· featured'}
                </p>
              </div>
              <Link to={`/admin/products/${p.id}`} className="font-mono text-xs uppercase tracking-widest text-acid hover:underline shrink-0">
                Edit
              </Link>
              <button onClick={() => handleDelete(p)} className="font-mono text-xs uppercase tracking-widest text-riot hover:underline shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
