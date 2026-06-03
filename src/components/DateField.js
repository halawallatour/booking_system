'use client';

import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

registerLocale('th', th);

const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function toTimeStr(date) {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Thai display, Buddhist-era year (พ.ศ. = ค.ศ. + 543)
function thaiDate(date) {
  if (!date) return '';
  return `${format(date, 'd', { locale: th })} ${TH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// Read-only input rendering a Thai พ.ศ. string (ignores the Gregorian value react-datepicker injects)
const ThaiInput = forwardRef(function ThaiInput({ display, onClick, placeholder, hasIcon }, ref) {
  return (
    <div className="dp-input-wrap">
      {hasIcon && <span className="dp-input-icon">📅</span>}
      <input ref={ref} type="text" readOnly onClick={onClick} value={display || ''} placeholder={placeholder}
        className={`input cursor-pointer ${hasIcon ? 'pl-9' : ''}`} />
    </div>
  );
});

// ----- calendar headers (Thai month dropdown + พ.ศ. year, pic1 style) -----
function dayHeader({ date, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) {
  return (
    <div className="dp-header">
      <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="dp-nav" aria-label="เดือนก่อนหน้า">‹</button>
      <div className="dp-header-mid">
        <span className="dp-month-select">
          <select value={date.getMonth()} onChange={e => changeMonth(+e.target.value)} aria-label="เลือกเดือน">
            {TH_MONTHS_FULL.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
        </span>
        <span className="dp-year">{date.getFullYear() + 543}</span>
      </div>
      <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="dp-nav" aria-label="เดือนถัดไป">›</button>
    </div>
  );
}
function yearNavHeader({ date, decreaseYear, increaseYear, prevYearButtonDisabled, nextYearButtonDisabled }) {
  return (
    <div className="dp-header">
      <button type="button" onClick={decreaseYear} disabled={prevYearButtonDisabled} className="dp-nav" aria-label="ปีก่อนหน้า">‹</button>
      <span className="dp-year">พ.ศ. {date.getFullYear() + 543}</span>
      <button type="button" onClick={increaseYear} disabled={nextYearButtonDisabled} className="dp-nav" aria-label="ปีถัดไป">›</button>
    </div>
  );
}

const shared = { locale: 'th', showPopperArrow: false, popperClassName: 'dp-popper', portalId: 'datepicker-portal', wrapperClassName: 'w-full', calendarClassName: 'dp-cal', isClearable: true };

// Single date → onChange('YYYY-MM-DD')
export function DateField({ value, onChange, placeholder = 'เลือกวันที่' }) {
  const date = toDate(value);
  return (
    <DatePicker {...shared} renderCustomHeader={dayHeader} selected={date}
      onChange={d => onChange(toStr(d))}
      customInput={<ThaiInput display={thaiDate(date)} placeholder={placeholder} hasIcon />} />
  );
}

// From-to range in one popup → onChange(startStr, endStr)
export function DateRangeField({ start, end, onChange, placeholder = 'เลือกช่วงวันที่' }) {
  const s = toDate(start), e = toDate(end);
  const display = s ? (e ? `${thaiDate(s)} – ${thaiDate(e)}` : thaiDate(s)) : '';
  return (
    <DatePicker {...shared} renderCustomHeader={dayHeader} selectsRange startDate={s} endDate={e}
      onChange={([ns, ne]) => onChange(toStr(ns), toStr(ne))}
      customInput={<ThaiInput display={display} placeholder={placeholder} hasIcon />} />
  );
}

// Time-only, 24h 'HH:mm' → onChange('HH:mm')
export function TimeField({ value, onChange, placeholder = 'เลือกเวลา' }) {
  return (
    <DatePicker locale="th" showPopperArrow={false} popperClassName="dp-popper" portalId="datepicker-portal"
      wrapperClassName="w-full" isClearable selected={toTime(value)} onChange={d => onChange(toTimeStr(d))}
      showTimeSelect showTimeSelectOnly timeFormat="HH:mm" dateFormat="HH:mm" timeIntervals={15} timeCaption="เวลา"
      placeholderText={placeholder} className="input" />
  );
}

// Month picker → value/onChange 'YYYY-MM'
export function MonthField({ value, onChange, placeholder = 'เลือกเดือน' }) {
  const date = value ? new Date(+value.slice(0, 4), +value.slice(5, 7) - 1, 1) : null;
  const display = date ? `${TH_MONTHS_FULL[date.getMonth()]} ${date.getFullYear() + 543}` : '';
  return (
    <DatePicker {...shared} showMonthYearPicker renderCustomHeader={yearNavHeader}
      renderMonthContent={(m) => TH_MONTHS_SHORT[m]} selected={date}
      onChange={d => onChange(d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '')}
      customInput={<ThaiInput display={display} placeholder={placeholder} hasIcon />} />
  );
}

// Year picker (พ.ศ. cells) → value/onChange 'YYYY'
export function YearField({ value, onChange, placeholder = 'เลือกปี' }) {
  const date = value ? new Date(+value, 0, 1) : null;
  const display = date ? `พ.ศ. ${date.getFullYear() + 543}` : '';
  return (
    <DatePicker {...shared} showYearPicker yearItemNumber={12} renderYearContent={(y) => y + 543} selected={date}
      onChange={d => onChange(d ? String(d.getFullYear()) : '')}
      customInput={<ThaiInput display={display} placeholder={placeholder} hasIcon />} />
  );
}
