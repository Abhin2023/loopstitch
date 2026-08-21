import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import { useCart } from '../context/CartContext'
import { formatINR } from '../utils/format'

const initialForm = {
  customer_name: '', customer_email: '', customer_phone: '',
  shipping_address: '', city: '', state: '', pincode: '',
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-slate font-mono text-sm mb-6">Your cart is empty.</p>
        <Link to="/shop" className="text-acid font-mono text-xs uppercase tracking-widest">← Back to shop</Link>
      </div>
    )
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        items: items.map((i) => ({ product_id: i.productId, size: i.size, quantity: i.quantity })),
      }
      const res = await client.post('/api/orders', payload)
      const orderData = res.data
      clearCart()
      navigate('/order/confirm', { state: { order: orderData } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong placing your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-4xl uppercase text-paper mb-10">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
            <Field label="Phone" name="customer_phone" value={form.customer_phone} onChange={handleChange} required pattern="[0-9]{10}" title="Enter a valid 10-digit phone number" />
          </div>
          <Field label="Email" name="customer_email" type="email" value={form.customer_email} onChange={handleChange} required />
          <Field label="Address" name="shipping_address" value={form.shipping_address} onChange={handleChange} required textarea />
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="City" name="city" value={form.city} onChange={handleChange} required />
            <Field label="State" name="state" value={form.state} onChange={handleChange} required />
            <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} required pattern="[0-9]{6}" title="Enter a valid 6-digit pincode" />
          </div>

          {error && (
            <div className="border border-riot bg-riot/10 text-riot text-sm font-mono px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-riot text-ink font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:bg-acid transition-colors disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : 'Place order · Cash / UPI on delivery'}
          </button>
          <p className="font-mono text-[11px] text-slate">
            This starter ships with a COD-style checkout. Wire in Razorpay/Stripe here for live card & UPI payments.
          </p>
        </form>

        <div className="h-fit border border-panel-2 p-6 space-y-3">
          {items.map((i) => (
            <div key={i.key} className="flex justify-between text-xs font-mono text-paper/80">
              <span>{i.name} × {i.quantity} ({i.size})</span>
              <span>{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-panel-2 pt-3 flex justify-between text-sm text-paper">
            <span>Subtotal</span>
            <span className="font-mono">{formatINR(subtotal)}</span>
          </div>
          <p className="font-mono text-[11px] text-slate">Shipping ₹79, free over ₹1,499</p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, textarea, ...props }) {
  const Tag = textarea ? 'textarea' : 'input'
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">{label}</span>
      <Tag
        {...props}
        rows={textarea ? 3 : undefined}
        className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none transition-colors"
      />
    </label>
  )
}
