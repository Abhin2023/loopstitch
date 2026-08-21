import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { formatINR } from '../../utils/format'
import Loader from '../../components/Loader'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get('/api/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => { console.error('Failed to load stats:', err); setError('Failed to load dashboard stats') })
  }, [])

  if (error) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!stats) return <Loader label="Loading stats" />

  const cards = [
    { label: 'Revenue', value: formatINR(stats.revenue), accent: true },
    { label: 'Orders', value: stats.total_orders },
    { label: 'Products', value: stats.total_products },
    { label: 'Low stock sizes', value: stats.low_stock_sizes, warn: stats.low_stock_sizes > 0 },
    { label: 'Sold-out sizes', value: stats.out_of_stock_sizes, danger: stats.out_of_stock_sizes > 0 },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-paper mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="border border-panel-2 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate mb-2">{c.label}</p>
            <p className={`font-display text-2xl ${c.accent ? 'text-acid' : c.danger ? 'text-riot' : c.warn ? 'text-acid' : 'text-paper'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link to="/admin/products/new" className="bg-riot text-ink font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-acid transition-colors">
          + Add product
        </Link>
        <Link to="/admin/orders" className="border border-panel-2 text-paper font-mono text-xs uppercase tracking-widest px-6 py-3 hover:border-paper transition-colors">
          View orders
        </Link>
      </div>
    </div>
  )
}
