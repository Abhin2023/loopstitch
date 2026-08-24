import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

const LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/offers', label: 'Offers' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  const { isAuthenticated, loading, logout, admin } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen bg-ink flex items-center justify-center font-mono text-slate text-sm">Loading…</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="w-56 border-r border-panel-2 flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-panel-2">
          <div className="font-display text-lg text-paper">LOOPSTITCH<span className="text-riot">.</span></div>
          <p className="font-mono text-[10px] text-slate uppercase tracking-widest mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
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
          {admin && <p className="font-mono text-[11px] text-slate mb-3">Signed in as {admin.username}</p>}
          <button onClick={logout} className="font-mono text-xs uppercase tracking-widest text-riot hover:text-acid">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-6 sm:px-10 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
