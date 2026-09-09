import { useState, useEffect } from 'react'
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
  const [codAdvancePercent, setCodAdvancePercent] = useState(10)
  const [payProcessing, setPayProcessing] = useState(false)

  useEffect(() => {
    client.get('/api/settings/checkout').then((res) => {
      const codOn = res.data.cod_enabled
      setCodEnabled(codOn)
      setCodAdvancePercent(res.data.cod_advance_percent || 10)
      if (!codOn) setPaymentMethod('online')
    }).catch(() => {})
  }, [])

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

  const launchRazorpay = (orderData, amountToPay, orderNumber) => {
    if (!window.Razorpay) {
      setError('Payment module failed to load. Please refresh and try again.')
      setPayProcessing(false)
      return
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!keyId) {
      setError('Payment is not configured. Please try again later.')
      setPayProcessing(false)
      return
    }

    const options = {
      key: keyId,
      amount: Math.round(amountToPay * 100),
      currency: 'INR',
      name: 'Loopstitch Co.',
      description: `Order #${orderNumber}`,
      order_id: orderData.razorpay_order_id,
      handler: async function (response) {
        try {
          await client.post('/api/razorpay/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_number: orderNumber,
          })
          clearCart()
          setPayProcessing(false)
          navigate('/order/confirm', {
            state: { order: { ...orderData, razorpay_order_id: response.razorpay_order_id } },
          })
        } catch {
          setError('Payment verification failed. Please contact support.')
          setPayProcessing(false)
        }
      },
      prefill: {
        name: form.customer_name,
        email: form.customer_email,
        contact: form.customer_phone,
      },
      theme: {
        color: '#FF3B5C',
      },
      modal: {
        ondismiss: function () {
          setError('Payment was cancelled. Your order has not been placed.')
          setPayProcessing(false)
        },
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function () {
      setError('Payment failed. Please try again.')
      setPayProcessing(false)
    })
    rzp.open()
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

      // Determine how much to charge via Razorpay
      let amountToPay = orderData.total
      if (paymentMethod === 'cod') {
        amountToPay = orderData.cod_advance_paid
      }

      if (amountToPay > 0) {
        // Create Razorpay order for the amount to be paid
        setSubmitting(false)
        setPayProcessing(true)
        try {
          const rpRes = await client.post('/api/razorpay/create-order', {
            amount: amountToPay,
            receipt: orderData.order_number,
          })
          launchRazorpay({ ...orderData, razorpay_order_id: rpRes.data.order_id }, amountToPay, orderData.order_number)
        } catch {
          setError('Failed to initialize payment. Please try again.')
          setPayProcessing(false)
        }
        return
      }

      // No online payment needed (shouldn't happen with current logic, but safe fallback)
      clearCart()
      navigate('/order/confirm', { state: { order: orderData } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong placing your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (payProcessing) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-paper font-mono text-sm mb-6">Processing payment…</p>
        <p className="text-slate font-mono text-xs">Please complete the payment in the popup window. Do not close this page.</p>
      </div>
    )
  }

  // Calculate COD advance for display
  const codAdvanceAmount = quote ? Math.round(quote.total * codAdvancePercent / 100 * 100) / 100 : 0
  const codBalanceAmount = quote ? Math.round((quote.total - codAdvanceAmount) * 100) / 100 : 0

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
              <p className="font-mono text-[11px] text-slate">A secure Razorpay popup will appear to complete your payment.</p>
            )}
            {paymentMethod === 'cod' && (
              <div className="space-y-1">
                <p className="font-mono text-[11px] text-slate">
                  Pay {codAdvancePercent}% online now via Razorpay, rest {100 - codAdvancePercent}% on delivery.
                </p>
                {quote && (
                  <div className="font-mono text-[11px] text-paper/70 space-y-0.5 mt-2">
                    <p>Advance online: <span className="text-acid">{formatINR(codAdvanceAmount)}</span></p>
                    <p>Balance on delivery: <span className="text-paper">{formatINR(codBalanceAmount)}</span></p>
                  </div>
                )}
              </div>
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
            {submitting ? 'Placing order…' : paymentMethod === 'online' ? 'Place order · Pay online' : `Place order · Pay ${formatINR(codAdvanceAmount)} now`}
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
              {paymentMethod === 'cod' && quote.total > 0 && (
                <div className="border-t border-panel-2 pt-3 space-y-1">
                  <div className="flex justify-between text-xs font-mono text-acid">
                    <span>Pay now ({codAdvancePercent}%)</span>
                    <span>{formatINR(codAdvanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate">
                    <span>On delivery ({100 - codAdvancePercent}%)</span>
                    <span>{formatINR(codBalanceAmount)}</span>
                  </div>
                </div>
              )}
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
