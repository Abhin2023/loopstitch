import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import SewingCursor from './SewingCursor'
import InstallAppBanner from './InstallAppBanner'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <SewingCursor />
      <InstallAppBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
