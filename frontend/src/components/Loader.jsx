export default function Loader({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-2 border-panel-2 border-t-riot rounded-full animate-spin" />
      <span className="font-mono text-xs uppercase tracking-widest text-slate">{label}</span>
    </div>
  )
}
