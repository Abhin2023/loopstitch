import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { formatINR, formatDate } from '../utils/format'
import Loader from '../components/Loader'

const STATUS_STYLES = {
  pending: 'text-yellow-400',
  paid: 'text-acid',
  shipped: 'text-blue-400',
  delivered: 'text-green-400',
  cancelled: 'text-riot',
  failed: 'text-riot',
}

export default function OrderHistory() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    client.get('/api/orders/history')
      .then((res) => setOrders(res.data))
      .catch(() => setError('Failed to load order history'))
  }, [isAuthenticated])

  if (authLoading || !isAuthenticated) return <Loader label="Loading" />
  if (error) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!orders) return <Loader label="Loading orders" />

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-3xl sm:text-4xl uppercase text-paper mb-10">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate font-mono text-sm mb-6">No orders yet.</p>
          <Link to="/shop" className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-7 py-3.5 hover:bg-acid transition-colors inline-block">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="border border-panel-2 divide-y divide-panel-2">
          {orders.map((order) => (
            <div key={order.id} className="p-4">
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full text-left"
              >
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="font-mono text-sm text-paper">#{order.order_number}</p>
                    <p className="font-mono text-[11px] text-slate mt-0.5">
                      {formatDate(order.created_at)} · {formatINR(order.total)}
                    </p>
                  </div>
                  <span className={`font-mono text-[11px] uppercase tracking-widest ${STATUS_STYLES[order.status] || 'text-slate'}`}>
                    {order.status}
                  </span>
                </div>
              </button>

              {expanded === order.id && (
                <div className="mt-4 pt-4 border-t border-panel-2 space-y-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate mb-2">Items</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-xs font-mono text-paper/80 py-1">
                        <span className="min-w-0 break-words">{item.product_name} × {item.quantity} ({item.size})</span>
                        <span className="shrink-0">{formatINR(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-panel-2 pt-3 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-slate"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
                    {(order.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-xs font-mono text-acid"><span>Offer discount</span><span>−{formatINR(order.discount_amount)}</span></div>
                    )}
                    {(order.coupon_discount || 0) > 0 && (
                      <div className="flex justify-between gap-3 text-xs font-mono text-acid"><span className="min-w-0 break-words">Coupon ({order.coupon_code})</span><span className="shrink-0">−{formatINR(order.coupon_discount)}</span></div>
                    )}
                    <div className="flex justify-between text-xs font-mono text-slate"><span>Shipping</span><span>{formatINR(order.shipping_fee)}</span></div>
                    <div className="flex justify-between text-sm font-mono text-paper pt-1"><span>Total</span><span>{formatINR(order.total)}</span></div>
                  </div>

                  {order.payment_method === 'cod' && (order.cod_advance_paid || 0) > 0 && (
                    <div className="border-t border-panel-2 pt-3 space-y-1">
                      <div className="flex justify-between text-xs font-mono text-acid">
                        <span>Advance paid online ({order.cod_advance_percent}%)</span>
                        <span>{formatINR(order.cod_advance_paid)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-slate">
                        <span>Balance on delivery</span>
                        <span>{formatINR(order.total - order.cod_advance_paid)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-mono text-slate">
                    <span>Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</span>
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
