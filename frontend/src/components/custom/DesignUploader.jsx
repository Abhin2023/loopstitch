import { useState, useRef } from 'react'
import client from '../../api/client'

const PRINT_AREAS = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
]

export default function DesignUploader({ designs, setDesigns }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('print_area', 'front')
        fd.append('notes', '')
        const res = await client.post('/api/custom/designs/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setDesigns((prev) => [...prev, res.data])
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const updateDesign = (index, field, value) => {
    setDesigns(designs.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  const removeDesign = (index) => {
    setDesigns(designs.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-widest text-acid mb-6">Upload your designs</h2>
      <p className="font-mono text-[11px] text-slate mb-6">Upload images (JPG, PNG, WEBP, GIF) or PDFs. Assign each file to a print area and add any notes for the printing team.</p>

      <div className="border border-dashed border-panel-2 p-8 text-center hover:border-acid/50 transition-all">
        <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={handleUpload}
          className="hidden" id="design-upload" />
        <label htmlFor="design-upload" className="cursor-pointer">
          <span className="font-mono text-4xl text-panel-2 block mb-3">+</span>
          <span className="font-mono text-xs uppercase tracking-widest text-slate">
            {uploading ? 'Uploading...' : 'Click to upload files'}
          </span>
        </label>
      </div>

      {error && <p className="text-riot font-mono text-xs mt-3">{error}</p>}

      {designs.length > 0 && (
        <div className="mt-6 space-y-4">
          {designs.map((d, i) => (
            <div key={i} className="border border-panel-2 p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 border border-panel-2 flex-shrink-0 overflow-hidden">
                  {d.file_type === 'pdf' ? (
                    <div className="w-full h-full flex items-center justify-center bg-panel">
                      <span className="font-mono text-[10px] text-slate">PDF</span>
                    </div>
                  ) : (
                    <img src={d.file_url} alt={d.file_name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-paper truncate">{d.file_name}</p>
                  <div className="flex gap-3 mt-2">
                    <select value={d.print_area} onChange={(e) => updateDesign(i, 'print_area', e.target.value)}
                      className="bg-panel border border-panel-2 px-2 py-1 text-xs text-paper font-mono focus:border-acid outline-none">
                      {PRINT_AREAS.map((pa) => (
                        <option key={pa.value} value={pa.value}>{pa.label}</option>
                      ))}
                    </select>
                    <input type="text" placeholder="Notes (optional)" value={d.notes}
                      onChange={(e) => updateDesign(i, 'notes', e.target.value)}
                      className="flex-1 bg-panel border border-panel-2 px-2 py-1 text-xs text-paper font-mono focus:border-acid outline-none" />
                  </div>
                </div>
                <button onClick={() => removeDesign(i)}
                  className="text-riot hover:text-riot/80 font-mono text-sm transition-all">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 border border-panel-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate">
          {designs.length} design{designs.length !== 1 ? 's' : ''} uploaded
        </span>
      </div>
    </div>
  )
}
