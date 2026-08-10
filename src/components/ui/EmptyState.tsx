import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-14 w-14 rounded-2xl bg-bordeaux/6 text-bordeaux/50 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" strokeWidth={1.75} />
      </div>
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-soft mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
