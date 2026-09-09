import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerAuth } from '../context/CustomerAuthContext'

const RESEND_COOLDOWN = 45

export default function LoginModal({ open, onClose }) {
  const { sendOTP, verifyOTP } = useCustomerAuth()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startCooldown = () => {
    clearTimer()
    setCooldown(RESEND_COOLDOWN)
  }

  useEffect(() => {
    if (cooldown <= 0) {
      clearTimer()
      return
    }
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [cooldown])

  useEffect(() => {
    if (!open) {
      setCooldown(0)
      clearTimer()
    }
  }, [open])

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError(null)
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    setLoading(true)
    try {
      await sendOTP(phone)
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError(null)
    setLoading(true)
    try {
      await sendOTP(phone)
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError(null)
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      await verifyOTP(phone, otp)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        reset()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('phone')
    setPhone('')
    setOtp('')
    setError(null)
    setSuccess(false)
    setLoading(false)
    setCooldown(0)
    clearTimer()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleChangePhone = () => {
    setStep('phone')
    setOtp('')
    setError(null)
    setCooldown(0)
    clearTimer()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="relative my-auto max-h-[90vh] overflow-y-auto bg-panel border border-panel-2 p-6 sm:p-8 w-full max-w-md space-y-5"
          >
            {success ? (
              <div className="text-center py-4">
                <div className="text-acid text-3xl mb-3">&#10003;</div>
                <h2 className="font-display text-2xl uppercase text-paper">Welcome!</h2>
                <p className="font-mono text-xs text-slate mt-2">You are now logged in.</p>
              </div>
            ) : step === 'phone' ? (
              <>
                <h2 className="font-display text-2xl uppercase text-paper">Login</h2>
                <p className="font-mono text-xs text-slate">
                  Enter your phone number. We'll send a verification code via WhatsApp.
                </p>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Phone number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null) }}
                      placeholder="98765 43210"
                      maxLength={10}
                      required
                      className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono"
                    />
                  </label>
                  {error && <p className="font-mono text-[11px] text-riot">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full bg-riot text-ink font-mono text-sm uppercase tracking-widest px-6 py-3 hover:bg-acid transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Sending…' : 'Send OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl uppercase text-paper">Verify OTP</h2>
                <p className="font-mono text-xs text-slate">
                  Enter the 6-digit code sent to <span className="text-paper">+91 {phone}</span>
                </p>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-slate block mb-1.5">Verification code</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                      className="w-full bg-panel border border-panel-2 px-3.5 py-2.5 text-sm text-paper focus:border-acid outline-none font-mono tracking-[0.3em] text-center text-lg"
                    />
                  </label>
                  {error && <p className="font-mono text-[11px] text-riot">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-riot text-ink font-mono text-sm uppercase tracking-widest px-6 py-3 hover:bg-acid transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Verifying…' : 'Verify'}
                  </button>

                  <div className="text-center pt-1 h-8">
                    {cooldown > 0 ? (
                      <p className="font-mono text-xs text-slate">
                        Resend code in <span className="text-paper font-semibold">{cooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        className="font-mono text-xs uppercase tracking-widest text-acid hover:underline disabled:opacity-50"
                      >
                        {loading ? 'Sending…' : 'Resend OTP'}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleChangePhone}
                    className="font-mono text-[11px] uppercase tracking-widest text-slate hover:text-paper w-full text-center"
                  >
                    ← Change phone number
                  </button>
                </form>
              </>
            )}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 min-w-11 min-h-11 flex items-center justify-center text-slate hover:text-paper text-lg"
              aria-label="Close"
            >
              &#10005;
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
