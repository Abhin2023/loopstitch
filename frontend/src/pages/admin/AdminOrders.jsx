import { useEffect, useState } from 'react'
import client from '../../api/client'
import { formatINR, formatDate } from '../../utils/format'
import Loader from '../../components/Loader'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)

  const load = () => {
    client.get('/api/admin/orders').then((res) => setOrders(res.data)).catch(() => setError('Failed to load orders'))
  }

  useEffect(load, [])

  const handleStatusChange = async (order, status) => {
    setUpdating(order.id)
    try {
      const res = await client.patch(`/api/admin/orders/${order.id}/status`, { status })
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.data : o)))
    } catch {
      alert('Failed to update status.')
    } finally {
      setUpdating(null)
    }
  }

  const downloadInvoice = async (order) => {
    try {
      const res = await client.get(`/api/admin/orders/${order.id}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${order.order_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download invoice.')
    }
  }

  if (error) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!orders) return <Loader label="Loading orders" />

  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-paper mb-8">Orders</h1>

      {orders.length === 0 ? (
        <p className="font-mono text-sm text-slate">No orders yet.</p>
      ) : (
        <div className="border border-panel-2 divide-y divide-panel-2">
          {orders.map((order) => (
            <div key={order.id} className="p-4">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <button
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="text-left flex-1 min-w-[220px]"
                >
                  <p className="font-mono text-sm text-paper">#{order.order_number}</p>
                  <p className="font-mono text-[11px] text-slate mt-0.5">
                    {order.customer_name} · {formatDate(order.created_at)} · {formatINR(order.total)}
                  </p>
                </button>

                <select
                  value={order.status}
                  disabled={updating === order.id}
                  onChange={(e) => handleStatusChange(order, e.target.value)}
                  className="bg-panel border border-panel-2 px-3 py-2 text-xs font-mono uppercase tracking-widest text-paper focus:border-acid outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button
                  onClick={() => downloadInvoice(order)}
                  className="font-mono text-[11px] uppercase tracking-widest text-acid hover:underline shrink-0"
                >
                  Invoice
                </button>
              </div>

              {expanded === order.id && (
                <div className="mt-4 pt-4 border-t border-panel-2 grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate mb-2">Items</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs font-mono text-paper/80 py-1">
                        <span>{item.product_name} × {item.quantity} ({item.size})</span>
                        <span>{formatINR(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate mb-2">Shipping to</p>
                    <p className="text-xs text-paper/80 leading-relaxed">
                      {order.shipping_address}<br />
                      {order.city} {order.state} {order.pincode}<br />
                      {order.customer_phone} · {order.customer_email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
