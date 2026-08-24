import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import client from '../api/client'
import { useCart } from '../context/CartContext'
import useQuote from '../hooks/useQuote'
import { formatINR } from '../utils/format'

const initialForm = {
  customer_name: '', customer_email: '', customer_phone: '',
  shipping_address: '', city: '', state: '', pincode: '',
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const couponFromCart = location.state?.couponCode || ''
  const [couponCode, setCouponCode] = useState(couponFromCart)
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponError, setCouponError] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const quote = useQuote(items, couponApplied?.code || couponFromCart || '')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [codEnabled, setCodEnabled] = useState(false)
  const payuFormRef = useRef(null)
  const [payuFormData, setPayuFormData] = useState(null)

  useEffect(() => {
    client.get('/api/settings/checkout').then((res) => {
      const codOn = res.data.cod_enabled
      setCodEnabled(codOn)
      if (!codOn) setPaymentMethod('online')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (payuFormData && payuFormRef.current) {
      payuFormRef.current.submit()
    }
  }, [payuFormData])

  // Render hidden PayU form for auto-submit (must be before empty-cart check)
  if (payuFormData) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-paper font-mono text-sm mb-6">Redirecting to payment…</p>
        <p className="text-slate font-mono text-xs">Please do not close this page.</p>
        <form ref={payuFormRef} method="POST" action={payuFormData.payment_url} className="hidden">
          <input name="key" value={payuFormData.key || ''} readOnly />
          <input name="txnid" value={payuFormData.txnid || ''} readOnly />
          <input name="amount" value={payuFormData.amount || ''} readOnly />
          <input name="productinfo" value={payuFormData.productinfo || ''} readOnly />
          <input name="firstname" value={payuFormData.firstname || ''} readOnly />
          <input name="email" value={payuFormData.email || ''} readOnly />
          <input name="phone" value={payuFormData.phone || ''} readOnly />
          <input name="surl" value={payuFormData.surl || ''} readOnly />
          <input name="furl" value={payuFormData.furl || ''} readOnly />
          <input name="hash" value={payuFormData.hash || ''} readOnly />
          <input name="udf1" value={payuFormData.udf1 || ''} readOnly />
          <button type="submit">Pay now</button>
        </form>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-slate font-mono text-sm mb-6">Your cart is empty.</p>
        <Link to="/shop" className="text-acid font-mono text-xs uppercase tracking-widest">← Back to shop</Link>
      </div>
    )
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await client.post('/api/coupons/validate', { code, subtotal })
      const data = res.data
      if (data.valid) {
        setCouponApplied(data)
        setCouponError(null)
      } else {
        setCouponApplied(null)
        setCouponError(data.message || 'Invalid coupon code.')
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.')
      setCouponApplied(null)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponApplied(null)
    setCouponCode('')
    setCouponError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        payment_method: paymentMethod,
        coupon_code: couponApplied?.code || couponCode.trim().toUpperCase() || undefined,
        items: items.map((i) => ({ product_id: i.productId, size: i.size, quantity: i.quantity })),
      }
      const res = await client.post('/api/orders', payload)
      const data = res.data
      const orderData = data.order

      if (paymentMethod === 'online' && data.payu_form_data) {
        clearCart()
        setPayuFormData(data.payu_form_data)
        return
      }

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

          {/* Payment method */}
          <div className="border border-panel-2 p-5 space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Payment method</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
                className="accent-acid"
              />
              <span className="font-mono text-sm text-paper">Pay online — Card / UPI / Wallet</span>
            </label>
            {codEnabled && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="accent-acid"
                />
                <span className="font-mono text-sm text-paper">Cash on Delivery</span>
              </label>
            )}
            {paymentMethod === 'online' && (
              <p className="font-mono text-[11px] text-slate">You will be redirected to PayU's secure payment page.</p>
            )}
            {paymentMethod === 'cod' && (
              <p className="font-mono text-[11px] text-slate">Pay with cash when your order arrives.</p>
            )}
          </div>

          {error && (
            <div className="border border-riot bg-riot/10 text-riot text-sm font-mono px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-riot text-ink font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:bg-acid transition-colors disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : paymentMethod === 'online' ? 'Place order · Pay online' : 'Place order · Cash on delivery'}
          </button>
        </form>

        <div className="h-fit border border-panel-2 p-6 space-y-3">
          {items.map((i) => (
            <div key={i.key} className="flex justify-between text-xs font-mono text-paper/80">
              <span>{i.name} × {i.quantity} ({i.size})</span>
              <span>{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-panel-2 pt-3 flex justify-between text-sm text-paper/90">
            <span>Subtotal</span>
            <span className="font-mono">{formatINR(subtotal)}</span>
          </div>
          {quote && quote.discount > 0 && (
            <div className="flex justify-between text-sm text-acid">
              <span>Offer · {quote.offer_label}</span>
              <span className="font-mono">−{formatINR(quote.discount)}</span>
            </div>
          )}

          {/* Coupon input */}
          <div className="border-t border-panel-2 pt-3 mt-2 mb-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate mb-2">Coupon code</p>
            {couponApplied ? (
              <div className="flex items-center justify-between bg-acid/10 border border-acid/30 px-3 py-2">
                <span className="font-mono text-xs text-acid">{couponApplied.code} · {couponApplied.discount_percent}% off</span>
                <button onClick={handleRemoveCoupon} className="font-mono text-[10px] uppercase tracking-widest text-slate hover:text-riot ml-2 shrink-0">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(null) }}
                  placeholder="e.g. SUMMER20"
                  className="flex-1 bg-panel border border-panel-2 px-3 py-2 text-xs font-mono text-paper placeholder:text-slate-dim focus:border-acid outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="font-mono text-[10px] uppercase tracking-widest text-acid border border-acid px-3 py-2 hover:bg-acid hover:text-ink transition-colors disabled:opacity-40 shrink-0"
                >
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && (
              <p className="font-mono text-[11px] text-riot mt-1">{couponError}</p>
            )}
          </div>

          {quote && quote.coupon_discount > 0 && (
            <div className="flex justify-between text-sm text-acid">
              <span>Coupon · {quote.coupon_code}</span>
              <span className="font-mono">−{formatINR(quote.coupon_discount)}</span>
            </div>
          )}

          {quote && (
            <>
              <div className="flex justify-between text-sm text-paper/90">
                <span>Delivery</span>
                <span className="font-mono">{quote.shipping_fee === 0 ? 'FREE' : formatINR(quote.shipping_fee)}</span>
              </div>
              <div className="border-t border-panel-2 pt-3 flex justify-between text-base text-paper">
                <span>Total to pay</span>
                <span className="font-mono">{formatINR(quote.total)}</span>
              </div>
            </>
          )}
          {!quote && <p className="font-mono text-[11px] text-slate">Delivery calculated with your order</p>}
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
