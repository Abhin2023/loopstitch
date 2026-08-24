import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import Loader from '../../components/Loader'

const SCOPE_LABELS = { all: 'All products', category: 'Category', products: 'Selected products' }

export default function AdminOffers() {
  const [offers, setOffers] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    client.get('/api/admin/offers').then((res) => setOffers(res.data)).catch(() => setError('Failed to load offers'))
  }

  useEffect(load, [])

  const handleToggle = async (offer) => {
    try {
      await client.patch(`/api/admin/offers/${offer.id}/toggle`)
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: !o.is_active } : o)))
    } catch {
      alert('Failed to update offer.')
    }
  }

  const handleDelete = async (offer) => {
    if (!confirm(`Delete offer "${offer.name}"? This can't be undone.`)) return
    try {
      await client.delete(`/api/admin/offers/${offer.id}`)
      setOffers((prev) => prev.filter((o) => o.id !== offer.id))
    } catch {
      alert('Failed to delete offer.')
    }
  }

  if (error) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!offers) return <Loader label="Loading offers" />

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl uppercase text-paper">Offers</h1>
        <Link to="/admin/offers/new" className="bg-riot text-ink font-mono text-xs uppercase tracking-widest px-5 py-2.5 hover:bg-acid transition-colors">
          + New offer
        </Link>
      </div>

      <p className="font-mono text-[11px] text-slate mb-6">
        Buy X Get Y promotions. If several offers match a cart, the one saving the customer the most is applied automatically.
      </p>

      {offers.length === 0 ? (
        <p className="font-mono text-sm text-slate">No offers yet. Create your first Buy X Get Y deal.</p>
      ) : (
        <div className="border border-panel-2 divide-y divide-panel-2">
          {offers.map((o) => (
            <div key={o.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-paper text-sm truncate">
                  {o.name}
                  {!o.is_active && <span className="ml-2 font-mono text-[10px] text-slate">(paused)</span>}
                </p>
                <p className="font-mono text-[11px] text-slate mt-0.5">
                  Buy {o.buy_quantity} Get {o.get_quantity} · {SCOPE_LABELS[o.scope] || o.scope}
                  {o.scope === 'category' && ` (${o.category})`}
                </p>
              </div>
              <button
                onClick={() => handleToggle(o)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  o.is_active ? 'border-acid text-acid' : 'border-panel-2 text-slate hover:text-paper'
                }`}
              >
                {o.is_active ? 'Active' : 'Paused'}
              </button>
              <Link to={`/admin/offers/${o.id}`} className="font-mono text-xs uppercase tracking-widest text-acid hover:underline shrink-0">
                Edit
              </Link>
              <button onClick={() => handleDelete(o)} className="font-mono text-xs uppercase tracking-widest text-riot hover:underline shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
