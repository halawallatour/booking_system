import './globals.css';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import HeaderRefresh from '@/components/HeaderRefresh';
import HeaderNav from '@/components/HeaderNav';

export const metadata = { title: 'Hala Walla Tour Booking System', description: 'Tour & Hotel Booking Management' };

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
        <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-8">
            <Link href="/" className="font-bold text-lg tracking-tight text-[var(--color-brand-dark)] shrink-0">HALA WALLA</Link>
            <HeaderNav />
            <HeaderRefresh />
          </div>
        </header>
        <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
