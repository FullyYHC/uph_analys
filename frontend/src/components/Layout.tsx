import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="w-full px-6 py-4 flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">UPH 达成检讨系统</h1>
          <button
            onClick={() => {
              window.close();
            }}
            className="ml-4 px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            返回主页
          </button>
        </div>
      </header>
      <main className="w-full px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
