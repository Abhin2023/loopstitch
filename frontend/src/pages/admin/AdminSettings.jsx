import { useEffect, useState } from 'react'
import client from '../../api/client'
import Loader from '../../components/Loader'
import { formatINR } from '../../utils/format'

export default function AdminSettings() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get('/api/admin/settings').then((res) => setForm(res.data)).catch(() => setError('Failed to load settings'))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await client.patch('/api/admin/settings', {
        delivery_fee: Number(form.delivery_fee),
        free_shipping_threshold: Number(form.free_shipping_threshold),
      })
      setForm(res.data)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (error && !form) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!form) return <Loader label="Loading settings" />

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl uppercase text-paper mb-8">Store settings</h1>

      <form onSubmit={handleSubmit} className="border border-panel-2 p-6 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Delivery charges</h2>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Delivery fee (₹)</span>
          <input
            name="delivery_fee" type="number" min="0" step="1"
            value={form.delivery_fee} onChange={handleChange} required
            className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Free delivery on orders above (₹)</span>
          <input
            name="free_shipping_threshold" type="number" min="0" step="1"
            value={form.free_shipping_threshold} onChange={handleChange} required
            className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono"
          />
          <span className="font-mono text-[11px] text-slate block mt-2">
            Current rule: {formatINR(Number(form.free_shipping_threshold))}+ ships free, otherwise {formatINR(Number(form.delivery_fee))}. Free shipping is judged on cart value before discounts.
          </span>
        </label>

        {error && <div className="border border-riot bg-riot/10 text-riot text-sm font-mono px-4 py-3">{error}</div>}
        {saved && <div className="border border-acid bg-acid/10 text-acid text-sm font-mono px-4 py-3">Settings saved — applies to new checkouts immediately.</div>}

        <button type="submit" disabled={saving} className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:bg-acid transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
