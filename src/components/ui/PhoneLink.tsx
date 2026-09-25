import { useState } from 'react';
import clsx from 'clsx';
import { ConfirmDialog } from './Modal';

/** رقم هاتف قابل للنقر: يطلب تأكيداً ثم يبدأ المكالمة (tel:) */
export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  const [confirm, setConfirm] = useState(false);
  const dial = phone.replace(/[^\d+]/g, '');

  return (
    <>
      <button
        type="button"
        dir="ltr"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirm(true);
        }}
        className={clsx('hover:underline hover:text-bordeaux transition-colors', className)}
      >
        {phone}
      </button>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          window.location.href = `tel:${dial}`;
        }}
        title="الاتصال بولي الأمر"
        message={`هل تريد الاتصال بالرقم ${phone}؟`}
        confirmLabel="اتصال"
      />
    </>
  );
}
