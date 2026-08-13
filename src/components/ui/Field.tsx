import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ArabicDatePicker } from './ArabicDatePicker';

const baseInputClasses =
  'w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 transition-colors focus:border-bordeaux focus:outline-none disabled:bg-ink/5 disabled:text-ink-soft/70';

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs text-clay font-medium">{error}</p>}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(baseInputClasses, className)} {...props} />;
}

export function NumberInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" inputMode="decimal" className={clsx(baseInputClasses, 'tabular-nums', className)} {...props} />;
}

/**
 * تنبيه: يحافظ على نفس شكل onChange(e) الذي كان يوفّره input type="date"
 * الأصلي (عبر e.target.value)، حتى لا يحتاج أي مكان يستعمل DateInput
 * إلى تغيير طريقة استدعائه.
 */
export function DateInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <ArabicDatePicker
      value={value}
      onChange={(iso) => onChange({ target: { value: iso } })}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function Textarea({ className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={clsx(baseInputClasses, 'resize-none', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(baseInputClasses, 'appearance-none bg-no-repeat', className)} {...props}>
      {children}
    </select>
  );
}
