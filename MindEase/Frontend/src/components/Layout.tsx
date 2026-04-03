import { BarChart3, BookMarked, Settings } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';
import { store } from '../store/mindeaseStore';

const navItems = [
  // { to: '/chat', label: 'Talk to MindEase', icon: MessageCircleHeart },
  { to: '/journal', label: 'Journal', icon: BookMarked },
  { to: '/analytics', label: 'Mood Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid min-h-[88vh] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="soft-card flex flex-col gap-4 p-4 lg:min-h-[80vh]">
          <div className="flex items-center justify-between gap-4 lg:block lg:rounded-2xl lg:bg-gradient-to-r lg:from-cyan-500 lg:to-indigo-500 lg:p-4 lg:text-white">
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 p-2 text-white lg:bg-none lg:p-0">
              <h1 className="text-lg font-bold lg:text-xl">MindEase</h1>
            </div>
            <p className="hidden text-sm text-cyan-50 lg:mt-1 lg:block">A calming space for mindful check-ins.</p>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:space-y-2 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon size={16} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="flex flex-col gap-4">
          <div className="soft-card flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-slate-600">User: <span className="text-indigo-600">Surya</span></span>
            </div>
            <button
              onClick={() => {
                store.logout();
                window.location.href = '/login';
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
            >
              Log Out
            </button>
          </div>
          <div className="soft-card flex-1 p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
