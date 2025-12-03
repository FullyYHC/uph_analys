import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="w-full px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">UPH 达成检讨系统</h1>
        </div>
      </header>
      <main className="w-full px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
