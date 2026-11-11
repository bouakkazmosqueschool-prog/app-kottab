import { useState } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { MONTHS_MA, formatShortDate } from '../../lib/dates';
import type { Payment } from '../../types';

type PublicPayment = Pick<Payment, 'period' | 'amount' | 'paidAt'>;

export function PublicPaymentCalendar({ payments }: { payments: PublicPayment[] }) {
  const currentYear = String(new Date().getFullYear());
  const [year, setYear] = useState(currentYear);
  const years = [...new Set([currentYear, ...payments.map(p => p.period.slice(0, 4))])].sort().reverse();
  const yearPayments = payments.filter(p => p.period.startsWith(`${year}-`));
  const latest = [...yearPayments].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0];

  return <section className="carnet-panel" aria-labelledby="public-payments-heading">
    <div className="flex justify-between items-center gap-3 flex-wrap">
      <h2 id="public-payments-heading" className="flex items-center gap-2"><CalendarDays className="w-5 h-5" aria-hidden="true" />الأداءات المسجّلة</h2>
      <label className="flex items-center gap-2 text-sm"><span>السنة</span><select className="carnet-select" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
    </div>
    <div className="carnet-metrics">
      <div><strong>{yearPayments.reduce((sum, p) => sum + Number(p.amount), 0)} درهم</strong><span>مجموع الأداءات لسنة {year}</span></div>
      <div><strong>{yearPayments.length}</strong><span>أداءات مسجّلة</span></div>
      <div><strong>{latest ? formatShortDate(latest.paidAt) : '—'}</strong><span>تاريخ آخر أداء لهذه السنة</span></div>
    </div>
    <div className="payment-year-grid" aria-label={`تقويم الأداءات لسنة ${year}`}>
      {MONTHS_MA.map((name, index) => {
        const period = `${year}-${String(index + 1).padStart(2, '0')}`;
        const payment = yearPayments.find(p => p.period === period);
        return <div key={period} className={`payment-month ${payment ? 'payment-recorded' : ''}`}>
          <span className="flex items-center justify-between gap-2"><span>{name}</span>{payment && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}</span>
          <strong>{payment ? `${payment.amount} درهم` : '—'}</strong>
          <span className="text-xs">{payment ? 'أداء مسجّل' : 'لا يوجد أداء مسجّل'}</span>
          {payment && <p className="carnet-muted text-xs">تاريخ الأداء: <time dateTime={payment.paidAt}>{formatShortDate(payment.paidAt)}</time></p>}
        </div>;
      })}
    </div>
  </section>;
}
