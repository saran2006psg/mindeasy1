import { BarChart3, BookMarked, MessageCircleHeart, Settings } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/chat', label: 'Talk to MindEase', icon: MessageCircleHeart },
  { to: '/journal', label: 'Journal', icon: BookMarked },
  { to: '/analytics', label: 'Mood Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid min-h-[88vh] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="soft-card p-4">
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 p-4 text-white">
            <h1 className="text-xl font-bold">MindEase</h1>
            <p className="mt-1 text-sm text-cyan-50">A calming space for mindful check-ins.</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="soft-card p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
