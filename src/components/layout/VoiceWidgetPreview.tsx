import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { X } from 'lucide-react';
import { useVoicePreviewStore } from '../../store/voicePreviewStore';
import { VoicePaymentDialog } from './VoicePaymentDialog';

const DRAG_THRESHOLD = 5;

export function VoiceWidgetPreview() {
  const visible = useVoicePreviewStore((state) => state.visible);
  const setVisible = useVoicePreviewStore((state) => state.setVisible);
  const position = useVoicePreviewStore((state) => state.position);
  const setPosition = useVoicePreviewStore((state) => state.setPosition);
  const [active, setActive] = useState(false);
  const [draftPosition, setDraftPosition] = useState<typeof position>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; left: number; top: number } | null>(null);
  const moved = useRef(false);

  if (!visible) return null;

  const displayedPosition = draftPosition ?? position;

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const { left, top } = event.currentTarget.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left, top };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function getDragPosition(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return null;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return null;
    moved.current = true;
    const { clientWidth, clientHeight } = document.documentElement;
    return {
      x: Math.max(0, Math.min(start.left + dx, clientWidth - event.currentTarget.offsetWidth - 16)),
      y: Math.max(16, Math.min(start.top + dy, clientHeight - event.currentTarget.offsetHeight)),
    };
  }

  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDraftPosition(null);
  }

  return (
    <div
      className="no-print fixed left-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30"
      style={displayedPosition ? {
        left: `clamp(0px, ${displayedPosition.x}px, calc(100% - 5rem))`,
        top: `clamp(1rem, ${displayedPosition.y}px, calc(100% - 4rem))`,
        bottom: 'auto',
      } : undefined}
    >
      <button
        type="button"
        aria-label="فتح الأوامر الصوتية"
        aria-haspopup="dialog"
        aria-expanded={active}
        onPointerDown={startDrag}
        onPointerMove={(event) => {
          const next = getDragPosition(event);
          if (next) setDraftPosition(next);
        }}
        onPointerUp={(event) => {
          const next = getDragPosition(event);
          if (next) setPosition(next);
          cancelDrag(event);
        }}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        onClick={(event) => {
          if (event.detail === 0 || !moved.current) setActive(true);
        }}
        className="voice-widget-face grid size-16 touch-none cursor-grab select-none place-items-center rounded-full border border-bordeaux text-white transition-shadow hover:ring-2 hover:ring-bordeaux/70 active:cursor-grabbing aria-expanded:ring-4 aria-expanded:ring-bordeaux/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bordeaux"
      >
        <span aria-hidden="true" className="flex size-10 items-center justify-center gap-[3px] rounded-full border border-current/50">
          <span className="h-2 w-[3px] rounded-full bg-current" />
          <span className="h-4 w-[3px] rounded-full bg-current" />
          <span className="h-6 w-[3px] rounded-full bg-current" />
          <span className="h-4 w-[3px] rounded-full bg-current" />
          <span className="h-2 w-[3px] rounded-full bg-current" />
        </span>
      </button>
      <button
        type="button"
        aria-label="إخفاء زر الأوامر الصوتية"
        title="إخفاء زر الأوامر الصوتية"
        onClick={() => {
          setActive(false);
          setVisible(false);
        }}
        className="absolute -top-4 -right-4 grid size-11 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-bordeaux"
      >
        <span className="grid size-6 place-items-center rounded-full border border-line bg-paper text-ink shadow-sm">
          <X aria-hidden="true" className="size-3.5" />
        </span>
      </button>
      {active && <VoicePaymentDialog onClose={() => setActive(false)} />}
    </div>
  );
}
