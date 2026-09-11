import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import Loader from '../components/Loader'
import ColorSizePicker from '../components/custom/ColorSizePicker'
import DesignUploader from '../components/custom/DesignUploader'
import PriceSummary from '../components/custom/PriceSummary'
import LoginModal from '../components/LoginModal'

const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export default function Customize() {
  const navigate = useNavigate()
  const { customer, isAuthenticated } = useCustomerAuth()

  const [config, setConfig] = useState(null)
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)

  const [step, setStep] = useState(1)
  const [selections, setSelections] = useState([])
  const [designs, setDesigns] = useState([])
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    shipping_address: '', city: '', state: '', pincode: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [codEnabled, setCodEnabled] = useState(false)
  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payProcessing, setPayProcessing] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/api/custom/config'),
      client.get('/api/custom/colors'),
    ]).then(([cfgRes, colRes]) => {
      setConfig(cfgRes.data)
      setColors(colRes.data)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load custom t-shirt configuration')
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    client.get('/api/settings/checkout').then((res) => {
      setCodEnabled(res.data.cod_enabled)
      setRazorpayKeyId(res.data.razorpay_key_id || '')
      if (!res.data.cod_enabled) setPaymentMethod('online')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (isAuthenticated && customer) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || customer.name || '',
        customer_email: f.customer_email || customer.email || '',
        customer_phone: f.customer_phone || customer.phone || '',
      }))
    }
  }, [isAuthenticated, customer])

  useEffect(() => {
    if (selections.length === 0) {
      setQuote(null)
      return
    }
    setQuoteLoading(true)
    const timeout = setTimeout(() => {
      client.post('/api/custom/quote', { colors: selections })
        .then((res) => setQuote(res.data))
        .catch((err) => {
          setQuote(null)
          if (err.response?.data?.detail) setError(err.response.data.detail)
        })
        .finally(() => setQuoteLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [selections])

  const totalPieces = selections.reduce((sum, sel) => sum + sel.sizes.reduce((s, sz) => s + sz.quantity, 0), 0)

  const launchRazorpay = (orderData, amountToPay) => {
    if (!window.Razorpay) {
      setSubmitError('Payment module failed to load. Please refresh and try again.')
      setPayProcessing(false)
      return
    }
    if (!razorpayKeyId) {
      setSubmitError('Payment is not configured. Please try again later.')
      setPayProcessing(false)
      return
    }

    const options = {
      key: razorpayKeyId,
      amount: Math.round(amountToPay * 100),
      currency: 'INR',
      name: 'Loopstitch Co.',
      description: `Custom order #${orderData.order_number}`,
      order_id: orderData.razorpay_order_id,
      handler: async (response) => {
        try {
          await client.post('/api/razorpay/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_number: orderData.order_number,
          })
          setPayProcessing(false)
          navigate('/order/confirm', {
            state: {
              order: {
                ...orderData,
                status: 'paid',
                razorpay_order_id: response.razorpay_order_id,
                payment_already_verified: true,
              },
            },
          })
        } catch {
          setSubmitError('Payment verification failed. Please contact support.')
          setPayProcessing(false)
        }
      },
      prefill: {
        name: form.customer_name,
        email: form.customer_email,
        contact: form.customer_phone,
      },
      theme: { color: '#FF3B5C' },
      modal: {
        ondismiss: () => {
          setSubmitError('Payment was cancelled. Your order remains pending; please contact support if you were charged.')
          setPayProcessing(false)
        },
      },
    }

    const razorpay = new window.Razorpay(options)
    razorpay.on('payment.failed', () => {
      setSubmitError('Payment failed. Please try again.')
      setPayProcessing(false)
    })
    razorpay.open()
  }

  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      setLoginOpen(true)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        ...form,
        payment_method: paymentMethod,
        colors: selections,
        designs: designs.map((d) => ({
          file_url: d.file_url,
          file_name: d.file_name,
          file_type: d.file_type,
          print_area: d.print_area,
          notes: d.notes || '',
        })),
      }
      const res = await client.post('/api/custom/order', payload)
      const orderData = res.data
      const amountToPay = paymentMethod === 'cod' ? orderData.cod_advance_paid : orderData.total

      if (amountToPay > 0) {
        setSubmitting(false)
        setPayProcessing(true)
        try {
          const razorpayOrder = await client.post('/api/razorpay/create-order', {
            amount: amountToPay,
            receipt: orderData.order_number,
          })
          launchRazorpay({ ...orderData, razorpay_order_id: razorpayOrder.data.order_id }, amountToPay)
        } catch (err) {
          setSubmitError(err.response?.data?.detail || 'Failed to initialize payment. Please try again.')
          setPayProcessing(false)
        }
        return
      }

      navigate('/order/confirm', { state: { order: orderData } })
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader label="Loading custom t-shirt" />
  if (payProcessing) return (
    <div className="max-w-3xl mx-auto px-5 py-24 text-center">
      <p className="text-paper font-mono text-sm mb-6">Processing payment...</p>
      <p className="text-slate font-mono text-xs">Complete the payment in the Razorpay window. Do not close this page.</p>
    </div>
  )
  if (error) return <div className="max-w-3xl mx-auto px-5 py-24 text-center"><p className="text-riot font-mono text-sm">{error}</p></div>
  if (!config || !config.is_active) return <div className="max-w-3xl mx-auto px-5 py-24 text-center"><p className="text-slate font-mono text-sm">Custom t-shirt printing is currently unavailable.</p></div>

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <h1 className="font-display text-3xl sm:text-4xl uppercase text-paper mb-2">Custom T-Shirt</h1>
      <p className="font-mono text-xs text-slate mb-10">Design your own tee. Select colors, sizes, upload artwork, and place your order.</p>

      {/* Step indicators */}
      <div className="flex gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => s < step + 1 && setStep(s)}
            className={`flex-1 h-1 transition-all ${s <= step ? 'bg-acid' : 'bg-panel-2'}`} />
        ))}
      </div>

      {step === 1 && (
        <ColorSizePicker
          colors={colors}
          sizes={SIZES}
          selections={selections}
          setSelections={setSelections}
          minQty={config.min_order_qty}
        />
      )}

      {step === 2 && (
        <DesignUploader designs={designs} setDesigns={setDesigns} />
      )}

      {step === 3 && (
        <form onSubmit={handleSubmitOrder}>
          <PriceSummary quote={quote} quoteLoading={quoteLoading} totalPieces={totalPieces} />

          <div className="border border-panel-2 p-6 mt-8 space-y-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Shipping details</h2>
            {[
              { name: 'customer_name', label: 'Full name', type: 'text' },
              { name: 'customer_email', label: 'Email', type: 'email' },
              { name: 'customer_phone', label: 'Phone', type: 'tel' },
              { name: 'shipping_address', label: 'Address', type: 'text' },
              { name: 'city', label: 'City', type: 'text' },
              { name: 'state', label: 'State', type: 'text' },
              { name: 'pincode', label: 'Pincode', type: 'text' },
            ].map(({ name, label, type }) => (
              <label key={name} className="block">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">{label}</span>
                <input
                  type={type} name={name} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                  required className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono"
                />
              </label>
            ))}
          </div>

          <div className="border border-panel-2 p-6 mt-6 space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Payment method</h2>
            <div className="flex gap-4">
              {['online', ...(codEnabled ? ['cod'] : [])].map((m) => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-3 font-mono text-xs uppercase tracking-widest border transition-all ${paymentMethod === m ? 'border-acid bg-acid/10 text-acid' : 'border-panel-2 text-slate hover:border-acid/50'}`}>
                  {m === 'online' ? 'Online (Razorpay)' : 'Cash on Delivery'}
                </button>
              ))}
            </div>
          </div>

          {submitError && <p className="text-riot font-mono text-xs mt-4">{submitError}</p>}

          <button type="submit" disabled={submitting || totalPieces < config.min_order_qty}
            className="w-full mt-8 py-4 bg-acid text-ink font-mono text-xs uppercase tracking-widest hover:bg-acid/90 disabled:opacity-40 transition-all">
            {submitting ? 'Placing order...' : `Place order — ${totalPieces} pieces`}
          </button>
        </form>
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-3 border border-panel-2 text-slate font-mono text-xs uppercase tracking-widest hover:border-acid/50 transition-all">
              Back
            </button>
          )}
          <button onClick={() => {
            if (step === 1 && totalPieces > 0 && totalPieces >= config.min_order_qty) setStep(2)
            else if (step === 2) setStep(3)
          }}
            disabled={step === 1 && (totalPieces === 0 || totalPieces < config.min_order_qty)}
            className="flex-1 py-3 bg-acid text-ink font-mono text-xs uppercase tracking-widest hover:bg-acid/90 disabled:opacity-40 transition-all">
            {step === 2 ? 'Proceed to checkout' : 'Next'}
          </button>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={() => { setLoginOpen(false); }} />
    </div>
  )
}
