import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import client, { mediaUrl } from '../../api/client'
import Loader from '../../components/Loader'

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const emptyForm = {
  name: '', description: '', price: '', compare_at_price: '',
  category: 'tshirt', colorway: '', is_active: true, is_featured: false,
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(emptyForm)
  const [sizes, setSizes] = useState(DEFAULT_SIZES.map((s) => ({ size: s, stock: 0 })))
  const [images, setImages] = useState([])
  const [productId, setProductId] = useState(id ? Number(id) : null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    client.get(`/api/admin/products/${id}`).then((res) => {
      const p = res.data
      setForm({
        name: p.name, description: p.description || '', price: p.price,
        compare_at_price: p.compare_at_price ?? '', category: p.category, colorway: p.colorway || '',
        is_active: p.is_active, is_featured: p.is_featured,
      })
      setSizes(p.sizes.length ? p.sizes.map((s) => ({ size: s.size, stock: s.stock })) : DEFAULT_SIZES.map((s) => ({ size: s, stock: 0 })))
      setImages(p.images)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load product')
      setLoading(false)
    })
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSizeChange = (index, field, value) => {
    setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: field === 'stock' ? Number(value) : value } : s)))
  }
  const addSizeRow = () => setSizes((prev) => [...prev, { size: '', stock: 0 }])
  const removeSizeRow = (index) => setSizes((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compare_at_price: form.compare_at_price === '' ? null : Number(form.compare_at_price),
        sizes: sizes.filter((s) => s.size.trim() !== ''),
      }
      if (isEdit) {
        await client.put(`/api/admin/products/${id}`, payload)
        navigate('/admin/products')
      } else {
        const res = await client.post('/api/admin/products', payload)
        setProductId(res.data.id)
        // Stay on page so images can be uploaded right after creating
        navigate(`/admin/products/${res.data.id}`, { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (!productId) {
      setError('Save the product first, then add images.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f))
      const res = await client.post(`/api/admin/products/${productId}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImages(res.data.images)
    } catch {
      setError('Image upload failed. Use JPG, PNG, WEBP, or GIF.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImageDelete = async (imageId) => {
    try {
      const res = await client.delete(`/api/admin/products/${productId}/images/${imageId}`)
      setImages(res.data.images)
    } catch {
      alert('Failed to delete image.')
    }
  }

  if (loading) return <Loader label="Loading product" />

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl uppercase text-paper mb-8">{isEdit ? 'Edit product' : 'New product'}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-panel-2 p-6 space-y-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Details</h2>
          <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
          <Field label="Description" name="description" value={form.description} onChange={handleChange} textarea />
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Price (₹)" name="price" type="number" min="0" step="1" value={form.price} onChange={handleChange} required />
            <Field label="Compare-at price (₹)" name="compare_at_price" type="number" min="0" step="1" value={form.compare_at_price} onChange={handleChange} />
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Category</span>
              <select name="category" value={form.category} onChange={handleChange} className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none">
                <option value="tshirt">T-Shirt</option>
                <option value="hoodie">Hoodie</option>
                <option value="accessory">Accessory</option>
              </select>
            </label>
          </div>
          <Field label="Colorway" name="colorway" value={form.colorway} onChange={handleChange} placeholder="e.g. Black, White" />
          <div className="flex gap-8">
            <label className="flex items-center gap-2 font-mono text-xs text-paper">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              Active (visible on storefront)
            </label>
            <label className="flex items-center gap-2 font-mono text-xs text-paper">
              <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} />
              Featured (shows on homepage)
            </label>
          </div>
        </div>

        <div className="border border-panel-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-acid">Sizes &amp; stock</h2>
            <button type="button" onClick={addSizeRow} className="font-mono text-[11px] uppercase tracking-widest text-slate hover:text-paper">
              + Add size
            </button>
          </div>
          <div className="space-y-3">
            {sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  value={s.size}
                  onChange={(e) => handleSizeChange(i, 'size', e.target.value.toUpperCase())}
                  placeholder="SIZE"
                  className="w-24 bg-panel border border-panel-2 px-3 py-2 text-sm text-paper focus:border-acid outline-none font-mono uppercase"
                />
                <input
                  type="number"
                  min="0"
                  value={s.stock}
                  onChange={(e) => handleSizeChange(i, 'stock', e.target.value)}
                  placeholder="Stock"
                  className="w-28 bg-panel border border-panel-2 px-3 py-2 text-sm text-paper focus:border-acid outline-none font-mono"
                />
                <span className="font-mono text-[11px] text-slate">{s.stock === 0 ? 'locked / sold out' : `${s.stock} units`}</span>
                <button type="button" onClick={() => removeSizeRow(i)} className="ml-auto font-mono text-[11px] text-riot hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="font-mono text-[11px] text-slate mt-4">
            Set stock to 0 to lock a size — it'll show as "Sold Out" on the storefront and can't be added to cart.
          </p>
        </div>

        <div className="border border-panel-2 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-acid mb-5">Images</h2>
          {!productId ? (
            <p className="font-mono text-xs text-slate">Save the product first, then upload images.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-5">
                {images.map((img) => (
                  <div key={img.id} className="relative w-24 h-28 group">
                    <img src={mediaUrl(img.url)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleImageDelete(img.id)}
                      className="absolute top-1 right-1 bg-ink/80 text-riot text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="font-mono text-xs text-slate" />
              {uploading && <p className="font-mono text-xs text-acid mt-2">Uploading…</p>}
            </>
          )}
        </div>

        {error && <div className="border border-riot bg-riot/10 text-riot text-sm font-mono px-4 py-3">{error}</div>}

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:bg-acid transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} className="border border-panel-2 text-paper font-mono text-sm uppercase tracking-widest px-8 py-3.5 hover:border-paper transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
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
