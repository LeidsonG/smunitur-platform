import { useRef, useState } from 'react';
import type React from 'react';

export function useSwipeToDismiss(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const dragging = useRef(false);
  const [dragY, setDragY] = useState(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const scrollTop = sheetRef.current?.scrollTop ?? 0;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && scrollTop === 0) {
      setDragY(delta);
    }
  }

  function onTouchEnd() {
    dragging.current = false;
    if (dragY > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  const sheetStyle: React.CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: dragY > 0 ? 'none' : 'transform 0.3s ease',
  };

  return { sheetRef, sheetStyle, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
