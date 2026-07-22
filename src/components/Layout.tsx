import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/profile', label: 'My Profile' },
  { to: '/matches', label: 'Matches' },
  { to: '/settings', label: 'Settings' },
]

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <NavLink to="/matches" className="flex items-center gap-2 font-semibold text-wingman-700">
            <span className="text-lg">Dr. Wingman</span>
          </NavLink>
          <nav className="flex items-center gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors ${
                    isActive ? 'bg-wingman-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <button
                onClick={() => void signOut()}
                className="rounded-full px-3 py-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
