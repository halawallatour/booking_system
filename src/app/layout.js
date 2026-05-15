import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Tour Booking System',
  description: 'Tour & Hotel Booking Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' } }} />
        <Sidebar />
        <main className="ml-0 md:ml-64 min-h-screen p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}

function Sidebar() {
  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[var(--color-border)] flex-col z-40">
        <div className="px-6 py-6 border-b border-[var(--color-border)]">
          <h1 className="text-xl font-bold text-[var(--color-brand)]">🌴 Tour Booking</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Management System</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarLink href="/" icon="📊" label="Dashboard" />
          <SidebarLink href="/customers" icon="👥" label="Customers" />
        </nav>
        <div className="px-6 py-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)]">v1.0 — Supabase + Next.js</p>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--color-border)] flex items-center px-4 z-40">
        <h1 className="text-lg font-bold text-[var(--color-brand)]">🌴 Tour Booking</h1>
        <div className="ml-auto flex gap-2">
          <a href="/" className="btn-ghost btn text-xs px-3 py-1.5">📊</a>
          <a href="/customers" className="btn-ghost btn text-xs px-3 py-1.5">👥</a>
        </div>
      </div>
      <div className="md:hidden h-14" />
    </>
  );
}

function SidebarLink({ href, icon, label }) {
  return (
    <a href={href} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors">
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}
