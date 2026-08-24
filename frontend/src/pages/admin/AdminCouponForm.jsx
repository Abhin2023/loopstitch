import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../../api/client'
import Loader from '../../components/Loader'

const emptyForm = {
  code: '', discount_percent: 10, max_uses: 0, min_order: 0,
  is_active: true, starts_at: '', ends_at: '',
}

export default function AdminCouponForm() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    client.get('/api/admin/coupons').then((res) => {
      const coupon = res.data.find((c) => c.id === Number(id))
      if (!coupon) throw new Error('not found')
      setForm({
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        max_uses: coupon.max_uses,
        min_order: coupon.min_order,
        is_active: coupon.is_active,
        starts_at: toLocalInput(coupon.starts_at),
        ends_at: toLocalInput(coupon.ends_at),
      })
      setLoading(false)
    }).catch(() => {
      setError('Failed to load coupon')
      setLoading(false)
    })
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_uses: Number(form.max_uses),
        min_order: Number(form.min_order),
        is_active: form.is_active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      }
      if (isEdit) {
        await client.put(`/api/admin/coupons/${id}`, payload)
      } else {
        await client.post('/api/admin/coupons', payload)
      }
      navigate('/admin/coupons')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save coupon.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader label="Loading coupon" />

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl uppercase text-paper mb-8">{isEdit ? 'Edit coupon' : 'New coupon'}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-panel-2 p-6 space-y-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Code &amp; discount</h2>
          <Field label="Coupon code" name="code" value={form.code} onChange={handleChange} required placeholder="e.g. SUMMER20" />
          <Field label="Discount percentage (%)" name="discount_percent" type="number" min="1" max="100" step="1" value={form.discount_percent} onChange={handleChange} required />
        </div>

        <div className="border border-panel-2 p-6 space-y-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Limits</h2>
          <Field label="Max total uses (0 = unlimited)" name="max_uses" type="number" min="0" step="1" value={form.max_uses} onChange={handleChange} />
          <Field label="Minimum order amount (₹, 0 = no minimum)" name="min_order" type="number" min="0" step="1" value={form.min_order} onChange={handleChange} />
          <p className="font-mono text-[11px] text-slate">
            {form.max_uses === 0
              ? 'Unlimited uses — this code can be applied any number of times.'
              : `Limited to ${form.max_uses} total uses${form.max_uses <= 10 ? ' — runs out fast!' : ''}.`}
          </p>
        </div>

        <div className="border border-panel-2 p-6 space-y-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Schedule &amp; status</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Starts at (optional)" name="starts_at" type="datetime-local" value={form.starts_at} onChange={handleChange} />
            <Field label="Ends at (optional)" name="ends_at" type="datetime-local" value={form.ends_at} onChange={handleChange} />
          </div>
          <label className="flex items-center gap-2 font-mono text-xs text-paper">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
            Active (customers can apply this code immediately)
          </label>
        </div>

        {error && <div className="border border-riot bg-riot/10 text-riot text-sm font-mono px-4 py-3">{error}</div>}

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:bg-acid transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create coupon'}
          </button>
          <button type="button" onClick={() => navigate('/admin/coupons')} className="border border-panel-2 text-paper font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:border-paper transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Field({ label, textarea, ...props }) {
  const Tag = textarea ? 'textarea' : 'input'
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">{label}</span>
      <Tag {...props} rows={textarea ? 3 : undefined} className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none transition-colors" />
    </label>
  )
}
