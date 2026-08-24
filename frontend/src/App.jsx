import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AdminAuthProvider } from './context/AdminAuthContext'

import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import ScrollToTop from './components/ScrollToTop'

import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import About from './pages/About'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'

import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminOffers from './pages/admin/AdminOffers'
import AdminOfferForm from './pages/admin/AdminOfferForm'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminCouponForm from './pages/admin/AdminCouponForm'
import AdminSettings from './pages/admin/AdminSettings'
import AdminOrders from './pages/admin/AdminOrders'

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            {/* Public storefront — no login link ever appears here */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/confirm" element={<OrderConfirmation />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Hidden admin area — reachable only by typing the URL directly */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id" element={<AdminProductForm />} />
              <Route path="offers" element={<AdminOffers />} />
              <Route path="offers/new" element={<AdminOfferForm />} />
              <Route path="offers/:id" element={<AdminOfferForm />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="coupons/new" element={<AdminCouponForm />} />
              <Route path="coupons/:id" element={<AdminCouponForm />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Routes>
        </CartProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}
