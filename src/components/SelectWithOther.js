'use client';

import { useState, useEffect } from 'react';

const OTHER = '__other__';

// A <select> with an extra "อื่นๆ (ระบุเอง)" option. Picking it reveals a text
// input; the typed value is stored on the record only (not added to the list).
export default function SelectWithOther({ options = [], value = '', onChange, placeholder = '--- เลือก ---' }) {
  const [otherMode, setOtherMode] = useState(false);

  // a non-empty value that isn't one of the options is a custom ("other") entry
  useEffect(() => {
    if (value && options.length && !options.includes(value)) setOtherMode(true);
  }, [value, options]);

  function handleSelect(e) {
    const v = e.target.value;
    if (v === OTHER) { setOtherMode(true); onChange(''); }
    else { setOtherMode(false); onChange(v); }
  }

  return (
    <>
      <select className="input" value={otherMode ? OTHER : value} onChange={handleSelect}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>อื่นๆ (ระบุเอง)</option>
      </select>
      {otherMode && (
        <input
          className="input mt-2"
          placeholder="ระบุเอง..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
      )}
    </>
  );
}
