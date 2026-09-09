import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client'

const CustomerAuthContext = createContext(null)

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('loopstitch_customer_token'))
  const [customer, setCustomer] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)

  // Validate token and fetch profile on mount
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    client.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setCustomer(res.data)
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('loopstitch_customer_token')
        setToken(null)
        setCustomer(null)
        setLoading(false)
      })
  }, [token])

  const sendOTP = useCallback(async (phone) => {
    const res = await client.post('/api/auth/send-otp', { phone })
    return res.data
  }, [])

  const verifyOTP = useCallback(async (phone, otp) => {
    const res = await client.post('/api/auth/verify-otp', { phone, otp })
    const { access_token, customer: cust } = res.data
    localStorage.setItem('loopstitch_customer_token', access_token)
    setToken(access_token)
    setCustomer(cust)
    return cust
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('loopstitch_customer_token')
    setToken(null)
    setCustomer(null)
    setAddresses([])
  }, [])

  const loadAddresses = useCallback(async () => {
    if (!token) return []
    try {
      const res = await client.get('/api/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAddresses(res.data)
      return res.data
    } catch {
      return []
    }
  }, [token])

  const addAddress = useCallback(async (addressData) => {
    const res = await client.post('/api/addresses', addressData, {
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadAddresses()
    return res.data
  }, [token, loadAddresses])

  const deleteAddress = useCallback(async (addressId) => {
    await client.delete(`/api/addresses/${addressId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadAddresses()
  }, [token, loadAddresses])

  const value = {
    token,
    customer,
    addresses,
    loading,
    isAuthenticated: !!token && !!customer,
    sendOTP,
    verifyOTP,
    logout,
    loadAddresses,
    addAddress,
    deleteAddress,
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  return ctx
}
