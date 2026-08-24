import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-panel-2 bg-panel mt-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
        <div>
          <div className="font-display text-xl text-paper mb-3">LOOPSTITCH<span className="text-riot">.</span></div>
          <p className="text-sm text-slate leading-relaxed max-w-xs">
            Small-batch DTF-printed tees for anime fans and streetwear heads.
            Every drop is limited — once a size is gone, it's gone.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-slate mb-4">Shop</div>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link to="/shop" className="hover:text-acid transition-colors">All products</Link></li>
            <li><Link to="/shop?category=tshirt" className="hover:text-acid transition-colors">Tees</Link></li>
            <li><Link to="/cart" className="hover:text-acid transition-colors">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-slate mb-4">Info</div>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link to="/about" className="hover:text-acid transition-colors">About the brand</Link></li>
            <li><Link to="/terms" className="hover:text-acid transition-colors">Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-acid transition-colors">Privacy Policy</Link></li>
            <li><Link to="/privacy" className="hover:text-acid transition-colors">Refund, Return &amp; Cancellation</Link></li>
            <li><Link to="/privacy" className="hover:text-acid transition-colors">Shipping Policy</Link></li>
            <li><a href="mailto:hello@loopstitch.online" className="hover:text-acid transition-colors">hello@loopstitch.online</a></li>
            <li className="text-slate">Moolad, Naduvannur, Calicut - 673614</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-panel-2 py-5 text-center font-mono text-[11px] tracking-widest text-slate-dim">
        © {new Date().getFullYear()} LOOPSTITCH CO. — PRINTED ON DEMAND, MADE FOR FANS.
      </div>
    </footer>
  )
}
