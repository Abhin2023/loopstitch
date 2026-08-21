export const formatINR = (amount) => {
  const n = Number(amount || 0)
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}
