'use client';

import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

registerLocale('th', th);

// ----- conversion helpers (storage stays Gregorian 'YYYY-MM-DD' / 'HH:mm') -----
function toDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toStr(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTime(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toTimeStr(date) {
  if (!date) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Thai display with Buddhist-era year (พ.ศ. = ค.ศ. + 543), short Thai month.
function thaiDate(date) {
  if (!date) return '';
  return `${format(date, 'd MMM', { locale: th })} ${date.getFullYear() + 543}`;
}

// Read-only input that renders a Thai พ.ศ. string instead of the Gregorian value
// react-datepicker would otherwise inject. We read our own `display` prop so the
// library's injected `value` is ignored.
const ThaiInput = forwardRef(function ThaiInput({ display, onClick, placeholder }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      readOnly
      onClick={onClick}
      value={display || ''}
      placeholder={placeholder}
      className="input cursor-pointer"
    />
  );
});

// Thai พ.ศ. month/year header with prev/next navigation.
function thaiHeader({ monthDate, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="dp-nav" aria-label="เดือนก่อนหน้า">‹</button>
      <span className="font-semibold text-sm">
        {format(monthDate, 'MMMM', { locale: th })} {monthDate.getFullYear() + 543}
      </span>
      <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="dp-nav" aria-label="เดือนถัดไป">›</button>
    </div>
  );
}

const sharedProps = {
  locale: 'th',
  showPopperArrow: false,
  renderCustomHeader: thaiHeader,
  popperClassName: 'dp-popper',
  // render the calendar at <body> so the modal's overflow:auto can't clip it
  portalId: 'datepicker-portal',
};

// Single date picker → onChange('YYYY-MM-DD')
export function DateField({ value, onChange, placeholder = 'เลือกวันที่' }) {
  const date = toDate(value);
  return (
    <DatePicker
      {...sharedProps}
      selected={date}
      onChange={(d) => onChange(toStr(d))}
      customInput={<ThaiInput display={thaiDate(date)} placeholder={placeholder} />}
      wrapperClassName="w-full"
      isClearable
    />
  );
}

// From-to range, picked in one popup → onChange('YYYY-MM-DD' start, 'YYYY-MM-DD' end)
export function DateRangeField({ start, end, onChange, placeholder = 'เลือกช่วงวันที่' }) {
  const s = toDate(start);
  const e = toDate(end);
  const display = s ? (e ? `${thaiDate(s)} – ${thaiDate(e)}` : thaiDate(s)) : '';
  return (
    <DatePicker
      {...sharedProps}
      selectsRange
      startDate={s}
      endDate={e}
      onChange={([ns, ne]) => onChange(toStr(ns), toStr(ne))}
      customInput={<ThaiInput display={display} placeholder={placeholder} />}
      wrapperClassName="w-full"
      isClearable
    />
  );
}

// Time-only picker locked to 24h 'HH:mm' → onChange('HH:mm')
export function TimeField({ value, onChange, placeholder = 'เลือกเวลา' }) {
  return (
    <DatePicker
      locale="th"
      showPopperArrow={false}
      popperClassName="dp-popper"
      portalId="datepicker-portal"
      selected={toTime(value)}
      onChange={(d) => onChange(toTimeStr(d))}
      showTimeSelect
      showTimeSelectOnly
      timeFormat="HH:mm"
      dateFormat="HH:mm"
      timeIntervals={15}
      timeCaption="เวลา"
      placeholderText={placeholder}
      className="input"
      wrapperClassName="w-full"
      isClearable
    />
  );
}
