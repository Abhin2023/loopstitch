import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import SewingCursor from './SewingCursor'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <SewingCursor />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
