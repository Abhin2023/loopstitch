import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?category=tshirt', label: 'Tees' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { count } = useCart()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur border-b border-panel-2">
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl sm:text-2xl tracking-wide text-paper" onClick={() => setOpen(false)}>
          LOOPSTITCH<span className="text-riot">.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = link.to === location.pathname + location.search
            return (
              <NavLink
                key={link.label}
                to={link.to}
                className={
                  `font-mono text-xs uppercase tracking-widest transition-colors ${
                    isActive ? 'text-acid' : 'text-paper/70 hover:text-paper'
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-paper hover:text-acid transition-colors p-1"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <Link to="/cart" className="relative flex items-center gap-2 group" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-paper group-hover:text-acid transition-colors">
              <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
              <path d="M6 6 4.5 2H2" strokeLinecap="round" />
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
            </svg>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-3 bg-riot text-ink text-[10px] font-mono font-bold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            className="md:hidden text-paper"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-panel-2 bg-ink"
          >
            <div className="flex flex-col px-5 py-4 gap-4">
              {NAV_LINKS.map((link) => {
                const isActive = link.to === location.pathname + location.search
                return (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={
                      `font-mono text-sm uppercase tracking-widest ${
                        isActive ? 'text-acid' : 'text-paper/80'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                )
              })}
              <button
                onClick={() => { toggleTheme(); setOpen(false) }}
                className="font-mono text-sm uppercase tracking-widest text-paper/80 text-left"
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
