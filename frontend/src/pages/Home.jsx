import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import client from '../api/client'
import ProductCard from '../components/ProductCard'
import Loader from '../components/Loader'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .get('/api/products', { params: { featured: true } })
      .then((res) => setProducts(res.data))
      .catch((err) => { console.error('Featured fetch failed:', err); setProducts([]) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 screentone" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-14 relative">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-xs sm:text-sm text-riot tracking-[0.25em] uppercase mb-5"
          >
            Drop 001 — 100 pieces only
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display uppercase text-paper leading-[0.92] text-[15vw] sm:text-[9vw] lg:text-[7.5rem]"
          >
            Wear the
            <br />
            <span className="text-riot">panel.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-6 max-w-md text-paper/70 text-sm sm:text-base leading-relaxed"
          >
            Loopstitch Co. prints anime-inspired streetwear in small DTF batches out of Calicut, Kerala.
            No restocks, no mass production — once a size sells out, it's locked for good.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link
              to="/shop"
              className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-7 py-3.5 hover:bg-acid transition-colors"
            >
              Shop the drop
            </Link>
            <Link
              to="/about"
              className="border border-panel-2 text-paper font-mono text-sm uppercase tracking-widest px-7 py-3.5 hover:border-paper transition-colors"
            >
              The story
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono text-xs text-riot tracking-widest uppercase mb-2">Featured</p>
            <h2 className="font-display text-3xl sm:text-4xl uppercase text-paper">This week's picks</h2>
          </div>
          <Link to="/shop" className="hidden sm:block font-mono text-xs uppercase tracking-widest text-slate hover:text-acid transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <Loader label="Fetching drops" />
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate font-mono text-sm">
            No products yet — add some from the admin dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      <hr className="cutline max-w-7xl mx-auto" />

      {/* PROCESS STRIP */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 grid sm:grid-cols-3 gap-10">
        {[
          { label: 'Design', copy: 'Original anime & streetwear graphics, drawn in-house per drop.' },
          { label: 'Print', copy: 'DTF printed on 240 GSM heavyweight cotton for a premium, durable finish.' },
          { label: 'Ship', copy: 'Packed and shipped from Calicut, Kerala — tracked door to door.' },
        ].map((item) => (
          <div key={item.label}>
            <h3 className="font-display text-2xl uppercase text-acid mb-2">{item.label}</h3>
            <p className="text-sm text-paper/70 leading-relaxed">{item.copy}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
