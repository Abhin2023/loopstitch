import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-5 py-32 text-center">
      <h1 className="font-display text-6xl text-riot mb-4">404</h1>
      <p className="text-slate font-mono text-sm mb-8">This page isn't in the drop.</p>
      <Link to="/" className="bg-riot text-ink font-mono text-sm uppercase tracking-widest px-7 py-3.5 hover:bg-acid transition-colors">
        Back home
      </Link>
    </div>
  )
}
