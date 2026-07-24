import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/matches', label: 'Matches', icon: MatchesIcon },
  { to: '/profile', label: 'My Profile', icon: ProfileIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 sm:pb-0">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <NavLink to="/matches" className="flex items-center gap-2 font-semibold text-wingman-700">
            <span className="text-lg">Dr. Wingman</span>
          </NavLink>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
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
          {user && (
            <button
              onClick={() => void signOut()}
              className="text-sm text-neutral-500 hover:text-neutral-700 sm:hidden"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>

      {/* Fixed bottom tab bar — mobile web is the primary surface, so this is the primary nav there. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-4xl">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
                  isActive ? 'text-wingman-600' : 'text-neutral-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon active={isActive} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function MatchesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} />
      <path
        d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.6} />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}
