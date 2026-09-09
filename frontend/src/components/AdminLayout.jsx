import { useState, useEffect } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

const LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/offers', label: 'Offers' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  const { isAuthenticated, loading, logout, admin } = useAdminAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return <div className="min-h-screen bg-ink flex items-center justify-center font-mono text-slate text-sm">Loading…</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  return (
    <div className="min-h-screen bg-ink flex overflow-x-hidden">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-panel border border-panel-2 p-2 text-paper hover:text-acid transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-ink border-r border-panel-2 flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 py-6 border-b border-panel-2">
          <div className="font-display text-lg text-paper">LOOPSTITCH<span className="text-riot">.</span></div>
          <p className="font-mono text-[10px] text-slate uppercase tracking-widest mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block px-3 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                  isActive ? 'bg-panel text-acid' : 'text-slate hover:text-paper'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-panel-2">
          {admin && <p className="font-mono text-[11px] text-slate mb-3 truncate">Signed in as {admin.username}</p>}
          <button onClick={logout} className="font-mono text-xs uppercase tracking-widest text-riot hover:text-acid">
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-12 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
