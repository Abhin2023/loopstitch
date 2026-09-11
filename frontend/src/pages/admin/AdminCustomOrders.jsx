import { useState, useEffect } from 'react'
import client from '../../api/client'
import Loader from '../../components/Loader'
import { formatINR, formatDate } from '../../utils/format'

export default function AdminCustomOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    client.get('/api/admin/custom/orders').then((res) => {
      setOrders(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const loadDetails = async (orderId) => {
    setSelected(orderId)
    setDetailsLoading(true)
    try {
      const res = await client.get(`/api/admin/custom/orders/${orderId}`)
      setDetails(res.data)
    } catch {
      setDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    const res = await client.patch(`/api/admin/orders/${orderId}/status`, { status })
    setOrders(orders.map((o) => o.id === orderId ? { ...o, status: res.data.status || status } : o))
    if (details?.order?.id === orderId) {
      setDetails({ ...details, order: { ...details.order, status } })
    }
  }

  if (loading) return <Loader label="Loading custom orders" />

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl uppercase text-paper mb-8">Custom Orders</h1>

      {orders.length === 0 ? (
        <p className="text-slate font-mono text-sm">No custom orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className={`border p-4 cursor-pointer transition-all ${selected === o.id ? 'border-acid' : 'border-panel-2 hover:border-acid/50'}`}
              onClick={() => loadDetails(o.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-acid">{o.order_number}</span>
                  <span className="font-mono text-xs text-slate ml-3">{o.customer_name}</span>
                  <span className="font-mono text-xs text-slate ml-3">{o.custom_total_pieces} pcs</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-paper">{formatINR(o.total)}</span>
                  <select value={o.status} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="bg-panel border border-panel-2 px-2 py-1 text-xs text-paper font-mono focus:border-acid outline-none">
                    {['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'failed'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="font-mono text-[11px] text-slate mt-1">{formatDate(o.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4" onClick={() => { setSelected(null); setDetails(null) }}>
          <div className="bg-panel border border-panel-2 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detailsLoading ? (
              <Loader label="Loading details" />
            ) : details ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="font-display text-xl text-paper">{details.order.order_number}</h2>
                    <p className="font-mono text-xs text-slate">{details.order.customer_name} — {details.order.customer_phone}</p>
                    <p className="font-mono text-xs text-slate">{details.order.customer_email}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setDetails(null) }} className="text-slate hover:text-paper font-mono text-lg">✕</button>
                </div>

                <div className="border border-panel-2 p-4 mb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-acid mb-3">Shipping</h3>
                  <p className="font-mono text-xs text-paper">{details.order.shipping_address}</p>
                  <p className="font-mono text-xs text-slate">{details.order.city}, {details.order.state} - {details.order.pincode}</p>
                </div>

                <div className="border border-panel-2 p-4 mb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-acid mb-3">Items</h3>
                  {details.order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-panel-2 last:border-0">
                      <span className="font-mono text-xs text-paper">{item.product_name} — {item.color_name} / {item.size} × {item.quantity}</span>
                      <span className="font-mono text-xs text-slate">{formatINR(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {details.designs?.length > 0 && (
                  <div className="border border-panel-2 p-4 mb-4">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-acid mb-3">Designs</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {details.designs.map((d) => (
                        <div key={d.id} className="border border-panel-2 p-2">
                          {d.file_type === 'pdf' ? (
                            <div className="w-full h-20 bg-panel flex items-center justify-center mb-2">
                              <span className="font-mono text-[10px] text-slate">PDF</span>
                            </div>
                          ) : (
                            <img src={d.file_url} alt={d.file_name} className="w-full h-20 object-cover mb-2" />
                          )}
                          <p className="font-mono text-[10px] text-slate truncate">{d.file_name}</p>
                          <p className="font-mono text-[10px] text-acid">{d.print_area}</p>
                          {d.notes && <p className="font-mono text-[10px] text-slate mt-1">{d.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border border-panel-2 p-4">
                  <div className="flex justify-between font-mono text-xs text-slate mb-1">
                    <span>Subtotal</span><span>{formatINR(details.order.subtotal)}</span>
                  </div>
                  {details.order.discount_amount > 0 && (
                    <div className="flex justify-between font-mono text-xs text-acid mb-1">
                      <span>Discount</span><span>−{formatINR(details.order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono text-xs text-slate mb-1">
                    <span>Shipping</span><span>{formatINR(details.order.shipping_fee)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-sm text-paper border-t border-panel-2 mt-2 pt-2">
                    <span>Total ({details.order.custom_total_pieces} pcs)</span><span>{formatINR(details.order.total)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-slate mt-1">
                    <span>Payment</span><span>{details.order.payment_method.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-riot font-mono text-sm">Failed to load details</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
