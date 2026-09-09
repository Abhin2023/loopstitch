import { useEffect, useState } from 'react'
import client from '../../api/client'
import { formatDate } from '../../utils/format'
import Loader from '../../components/Loader'

const STATUS_LABELS = {
  pending: { label: 'Pending', color: 'text-yellow-400' },
  sent: { label: 'Sent', color: 'text-acid' },
  delivered: { label: 'Delivered', color: 'text-blue-400' },
  read: { label: 'Read', color: 'text-purple-400' },
  failed: { label: 'Failed', color: 'text-riot' },
}

const STATUS_FILTERS = ['', 'sent', 'delivered', 'read', 'failed', 'pending']

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState(null)
  const [resending, setResending] = useState(null)

  const load = () => {
    const params = new URLSearchParams({ page, per_page: 20 })
    if (statusFilter) params.set('status_filter', statusFilter)
    client.get(`/api/admin/notifications?${params}`)
      .then((res) => {
        setNotifications(res.data.items)
        setTotal(res.data.total)
      })
      .catch(() => setError('Failed to load notifications'))
  }

  useEffect(load, [page, statusFilter])

  const handleResend = async (n) => {
    if (!confirm(`Resend WhatsApp message to ${n.customer_name}?`)) return
    setResending(n.id)
    try {
      const res = await client.post(`/api/admin/notifications/${n.id}/resend`)
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? res.data : item)))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resend message.')
    } finally {
      setResending(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  if (error && !notifications) return <p className="text-riot font-mono text-sm">{error}</p>
  if (!notifications) return <Loader label="Loading notifications" />

  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-paper mb-8">WhatsApp Notifications</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPage(1) }}
            className={`font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              statusFilter === f
                ? 'border-acid bg-acid/10 text-acid'
                : 'border-panel-2 text-slate hover:text-paper'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {notifications.length === 0 ? (
        <p className="font-mono text-sm text-slate">No notifications{statusFilter ? ` with status "${statusFilter}"` : ''}.</p>
      ) : (
        <div className="border border-panel-2 divide-y divide-panel-2">
          {notifications.map((n) => {
            const statusInfo = STATUS_LABELS[n.status] || STATUS_LABELS.pending
            return (
              <div key={n.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-mono text-sm text-paper">
                      #{n.order_number}
                      <span className={`ml-2 text-[11px] ${statusInfo.color}`}>{statusInfo.label}</span>
                    </p>
                    <p className="font-mono text-[11px] text-slate mt-0.5">
                      {n.customer_name} · {n.customer_phone} · {formatDate(n.created_at)}
                    </p>
                    {n.error_message && (
                      <p className="font-mono text-[11px] text-riot mt-1 max-w-lg truncate" title={n.error_message}>
                        {n.error_message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {n.sent_at && (
                      <span className="font-mono text-[10px] text-slate" title={`Sent: ${formatDate(n.sent_at)}`}>
                        Sent {formatDate(n.sent_at)}
                      </span>
                    )}
                    {n.delivered_at && (
                      <span className="font-mono text-[10px] text-slate" title={`Delivered: ${formatDate(n.delivered_at)}`}>
                        Delivered {formatDate(n.delivered_at)}
                      </span>
                    )}
                    {n.status === 'failed' && (
                      <button
                        onClick={() => handleResend(n)}
                        disabled={resending === n.id}
                        className="font-mono text-[11px] uppercase tracking-widest text-acid hover:underline disabled:opacity-50"
                      >
                        {resending === n.id ? 'Sending…' : 'Resend'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="font-mono text-[11px] text-slate">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border border-panel-2 text-slate hover:text-paper disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-slate px-3 py-1.5">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border border-panel-2 text-slate hover:text-paper disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
