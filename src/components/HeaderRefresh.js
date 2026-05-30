'use client';
import { useEffect, useState } from 'react';

// Global refresh control shown in the top header (far right).
// It talks to the active page through a tiny window event bus:
//   - clicking dispatches 'app:refresh'  -> the current page re-fetches its data
//   - a page dispatches 'app:updated'    -> we stamp "last updated" and stop the spinner
export default function HeaderRefresh() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const onUpdated = () => { setLastUpdated(new Date()); setSpinning(false); };
    window.addEventListener('app:updated', onUpdated);
    return () => window.removeEventListener('app:updated', onUpdated);
  }, []);

  function handleRefresh() {
    setSpinning(true);
    window.dispatchEvent(new CustomEvent('app:refresh'));
    // safety: if no page responds, stop the spinner anyway
    setTimeout(() => setSpinning(false), 4000);
  }

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="ml-auto flex items-center gap-3">
      {timeStr && (
        <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline whitespace-nowrap">
          อัพเดตล่าสุด {timeStr} น.
        </span>
      )}
      <button onClick={handleRefresh} className="btn btn-outline-primary text-sm px-3 py-2" title="โหลดข้อมูลใหม่">
        <span className={spinning ? 'inline-block animate-spin' : 'inline-block'}>🔄</span> Refresh
      </button>
    </div>
  );
}
