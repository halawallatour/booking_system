'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

// Searchable dropdown that only allows picking an existing option (no free text).
// `options` is an array of strings. Selected value is a string ('' = none).
export default function Combobox({ options = [], value = '', onChange, placeholder = '--- เลือก ---' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  // close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => { setHighlight(0); }, [query, open]);

  function commit(val) {
    onChange(val);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) commit(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  }

  return (
    <div className="combobox" ref={rootRef}>
      <div
        className={`input flex items-center justify-between gap-2 cursor-pointer ${open ? 'combobox-open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none min-w-0"
            value={query}
            placeholder={value || 'พิมพ์เพื่อค้นหา...'}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`truncate ${value ? '' : 'text-[var(--color-text-muted)]'}`}>{value || placeholder}</span>
        )}
        <span className="text-[var(--color-text-muted)] shrink-0">▾</span>
      </div>

      {open && (
        <ul className="combobox-list" ref={listRef} role="listbox">
          {value && (
            <li
              className="combobox-option text-[var(--color-text-muted)]"
              onMouseDown={e => { e.preventDefault(); commit(''); }}
            >✕ ล้างค่า</li>
          )}
          {filtered.length === 0 ? (
            <li className="combobox-empty">ไม่พบรายการ</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={`combobox-option ${i === highlight ? 'combobox-active' : ''} ${opt === value ? 'combobox-selected' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={e => { e.preventDefault(); commit(opt); }}
              >{opt}</li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
