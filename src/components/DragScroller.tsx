"use client";

import { useRef } from "react";

/**
 * Horizontal carousel you can drag with the mouse (like the materialsmarket.com
 * product rows), in addition to touch-swipe and the scrollbar. Suppresses the
 * click that would otherwise fire on a child link when the user was dragging.
 */
export function DragScroller({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ down: false, startX: 0, scroll: 0, moved: false });

  return (
    <div
      ref={ref}
      className={`flex cursor-grab gap-4 overflow-x-auto select-none active:cursor-grabbing ${className}`}
      onPointerDown={(e) => {
        const el = ref.current;
        if (!el) return;
        state.current = {
          down: true,
          startX: e.clientX,
          scroll: el.scrollLeft,
          moved: false,
        };
      }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || !state.current.down) return;
        const dx = e.clientX - state.current.startX;
        if (Math.abs(dx) > 4) state.current.moved = true;
        el.scrollLeft = state.current.scroll - dx;
      }}
      onPointerUp={() => {
        state.current.down = false;
      }}
      onPointerLeave={() => {
        state.current.down = false;
      }}
      onClickCapture={(e) => {
        // If the pointer moved, treat it as a drag, not a click.
        if (state.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          state.current.moved = false;
        }
      }}
    >
      {children}
    </div>
  );
}
