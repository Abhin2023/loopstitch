import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatINR, formatDate } from '../utils/format'

export default function OrderConfirmation() {
  const location = useLocation()
  const order = location.state?.order

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-slate font-mono text-sm mb-6">No order data found.</p>
        <Link to="/shop" className="text-acid font-mono text-xs uppercase tracking-widest">← Back to shop</Link>
      </div>
    )
  }

  const nameParts = (order.customer_name || '').split(' ')
  const displayName = nameParts[0] || 'Customer'

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="font-mono text-xs text-acid tracking-widest uppercase">Order confirmed</span>
        <h1 className="font-display text-3xl sm:text-4xl uppercase text-paper mt-2 mb-1">Thank you, {displayName}</h1>
        <p className="text-slate text-sm font-mono mb-8">#{order.order_number} · {formatDate(order.created_at)}</p>

        <div className="border border-panel-2 p-6 mb-6">
          {(order.items || []).map((item) => (
            <div key={item.id} className="flex justify-between text-sm font-mono text-paper/80 py-1.5">
              <span>{item.product_name} × {item.quantity} ({item.size})</span>
              <span>{formatINR(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-panel-2 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-xs font-mono text-slate"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            <div className="flex justify-between text-xs font-mono text-slate"><span>Shipping</span><span>{formatINR(order.shipping_fee)}</span></div>
            <div className="flex justify-between text-sm font-mono text-paper pt-1"><span>Total</span><span>{formatINR(order.total)}</span></div>
          </div>
        </div>

        <div className="border border-panel-2 p-6 mb-8 text-sm text-paper/80 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-slate mb-2">Shipping to</p>
          <p>{order.shipping_address}</p>
          <p>{order.city} {order.state} {order.pincode}</p>
          <p className="font-mono text-xs text-slate mt-2">{order.customer_phone} · {order.customer_email}</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link to="/shop" className="border border-panel-2 text-paper font-mono text-sm uppercase tracking-widest px-7 py-3.5 hover:border-paper transition-colors">
            Continue shopping
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
