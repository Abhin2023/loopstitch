import { useState, useEffect } from 'react'
import client from '../../api/client'
import Loader from '../../components/Loader'

export default function AdminCustomTshirt() {
  const [tab, setTab] = useState('config')
  const [config, setConfig] = useState(null)
  const [colors, setColors] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [newColor, setNewColor] = useState({ name: '', hex_code: '#000000', is_active: true, position: 0 })
  const [newDiscount, setNewDiscount] = useState({ min_qty: 10, max_qty: null, discount_percent: 5, position: 0 })

  const load = () => {
    Promise.all([
      client.get('/api/admin/custom/config'),
      client.get('/api/admin/custom/colors'),
      client.get('/api/admin/custom/discounts'),
    ]).then(([cfgRes, colRes, disRes]) => {
      setConfig(cfgRes.data)
      setColors(colRes.data)
      setDiscounts(disRes.data)
      setLoading(false)
    }).catch(() => { setError('Failed to load'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await client.patch('/api/admin/custom/config', {
        base_price: Number(config.base_price),
        min_order_qty: Number(config.min_order_qty),
        is_active: config.is_active,
      })
      setConfig(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addColor = async () => {
    try {
      const res = await client.post('/api/admin/custom/colors', newColor)
      setColors([...colors, res.data])
      setNewColor({ name: '', hex_code: '#000000', is_active: true, position: colors.length })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add color')
    }
  }

  const toggleColor = async (id) => {
    const color = colors.find((c) => c.id === id)
    const res = await client.patch(`/api/admin/custom/colors/${id}`, { is_active: !color.is_active })
    setColors(colors.map((c) => c.id === id ? res.data : c))
  }

  const deleteColor = async (id) => {
    if (!confirm('Delete this color?')) return
    await client.delete(`/api/admin/custom/colors/${id}`)
    setColors(colors.filter((c) => c.id !== id))
  }

  const addDiscount = async () => {
    try {
      const res = await client.post('/api/admin/custom/discounts', newDiscount)
      setDiscounts([...discounts, res.data])
      setNewDiscount({ min_qty: 10, max_qty: null, discount_percent: 5, position: discounts.length })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add tier')
    }
  }

  const deleteDiscount = async (id) => {
    if (!confirm('Delete this tier?')) return
    await client.delete(`/api/admin/custom/discounts/${id}`)
    setDiscounts(discounts.filter((d) => d.id !== id))
  }

  if (loading) return <Loader label="Loading custom t-shirt config" />

  const TABS = [
    { key: 'config', label: 'Config' },
    { key: 'colors', label: 'Colors' },
    { key: 'discounts', label: 'Qty Discounts' },
  ]

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl sm:text-3xl uppercase text-paper mb-8">Custom T-Shirt</h1>

      {error && <p className="text-riot font-mono text-xs mb-4">{error}</p>}

      <div className="flex gap-1 mb-8 border-b border-panel-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-all ${tab === t.key ? 'text-acid border-b-2 border-acid' : 'text-slate hover:text-paper'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && config && (
        <div className="border border-panel-2 p-6 space-y-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={config.is_active}
              onChange={(e) => setConfig({ ...config, is_active: e.target.checked })} className="accent-acid mt-1" />
            <div>
              <span className="font-mono text-sm text-paper">Enable custom printing</span>
              <p className="font-mono text-[11px] text-slate">Toggle this to show/hide the custom t-shirt page on the storefront.</p>
            </div>
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Base price per piece (₹)</span>
            <input type="number" min="1" value={config.base_price}
              onChange={(e) => setConfig({ ...config, base_price: e.target.value })}
              className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Minimum order quantity</span>
            <input type="number" min="1" value={config.min_order_qty}
              onChange={(e) => setConfig({ ...config, min_order_qty: e.target.value })}
              className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" />
          </label>
          <button onClick={saveConfig} disabled={saving}
            className="px-6 py-2.5 bg-acid text-ink font-mono text-xs uppercase tracking-widest hover:bg-acid/90 disabled:opacity-40 transition-all">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save config'}
          </button>
        </div>
      )}

      {tab === 'colors' && (
        <div>
          <div className="border border-panel-2 p-6 mb-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-acid mb-4">Add color</h3>
            <div className="flex gap-3 items-end">
              <label className="flex-1">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Name</span>
                <input type="text" value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                  className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" placeholder="e.g. Black" />
              </label>
              <label>
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Hex</span>
                <input type="color" value={newColor.hex_code} onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                  className="w-12 h-10 bg-panel border border-panel-2 cursor-pointer" />
              </label>
              <button onClick={addColor} disabled={!newColor.name}
                className="px-4 py-2.5 bg-acid text-ink font-mono text-xs uppercase tracking-widest hover:bg-acid/90 disabled:opacity-40 transition-all">
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {colors.map((c) => (
              <div key={c.id} className="border border-panel-2 p-4 flex items-center gap-4">
                <span className="w-8 h-8 rounded-full border border-panel-2" style={{ backgroundColor: c.hex_code }} />
                <span className="flex-1 font-mono text-sm text-paper">{c.name}</span>
                <button onClick={() => toggleColor(c.id)}
                  className={`font-mono text-[11px] uppercase tracking-widest px-3 py-1 border transition-all ${c.is_active ? 'border-acid text-acid' : 'border-panel-2 text-slate'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteColor(c.id)} className="text-riot hover:text-riot/80 font-mono text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'discounts' && (
        <div>
          <div className="border border-panel-2 p-6 mb-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-acid mb-4">Add discount tier</h3>
            <div className="flex gap-3 items-end">
              <label className="flex-1">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Min qty</span>
                <input type="number" min="1" value={newDiscount.min_qty}
                  onChange={(e) => setNewDiscount({ ...newDiscount, min_qty: Number(e.target.value) })}
                  className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" />
              </label>
              <label className="flex-1">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Max qty (blank = unlimited)</span>
                <input type="number" min="1" value={newDiscount.max_qty || ''}
                  onChange={(e) => setNewDiscount({ ...newDiscount, max_qty: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" />
              </label>
              <label className="flex-1">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Discount %</span>
                <input type="number" min="0" max="100" value={newDiscount.discount_percent}
                  onChange={(e) => setNewDiscount({ ...newDiscount, discount_percent: Number(e.target.value) })}
                  className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono" />
              </label>
              <button onClick={addDiscount}
                className="px-4 py-2.5 bg-acid text-ink font-mono text-xs uppercase tracking-widest hover:bg-acid/90 disabled:opacity-40 transition-all">
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {discounts.map((d) => (
              <div key={d.id} className="border border-panel-2 p-4 flex items-center gap-4">
                <span className="font-mono text-sm text-paper flex-1">
                  {d.min_qty}–{d.max_qty || '∞'} pieces
                </span>
                <span className="font-mono text-sm text-acid">{d.discount_percent}% off</span>
                <button onClick={() => deleteDiscount(d.id)} className="text-riot hover:text-riot/80 font-mono text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
