import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Move, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ProductImageViewerProps {
  open: boolean;
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function ProductImageViewer({
  open,
  src,
  alt,
  title,
  onClose,
}: ProductImageViewerProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    dragRef.current = null;
    setDragging(false);
  };

  const updateZoom = (nextZoom: number) => {
    const next = clamp(
      Math.round(nextZoom / ZOOM_STEP) * ZOOM_STEP,
      MIN_ZOOM,
      MAX_ZOOM,
    );

    setZoom(next);
    if (next === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    resetView();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, src]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((current) => clamp(current + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        setZoom((current) => {
          const next = clamp(current - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
          if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
          return next;
        });
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const constrainPan = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || zoom <= MIN_ZOOM) return { x: 0, y: 0 };

    // Keep the zoomed product comfortably recoverable inside the viewer.
    const maxX = canvas.clientWidth * (zoom - 1) * 0.48 + 48;
    const maxY = canvas.clientHeight * (zoom - 1) * 0.48 + 48;

    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const next = constrainPan(
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY,
    );
    setPan(next);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-[#06110d]/95 text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${title || alt} image viewer`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
              Product Image Viewer
            </p>
            <h2 className="mt-0.5 truncate text-sm font-bold text-white sm:text-base">
              {title || alt}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            aria-label="Close image viewer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={canvasRef}
          className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8 ${
            zoom > MIN_ZOOM ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className={`max-h-full max-w-full select-none object-contain drop-shadow-2xl ${
                dragging ? '' : 'transition-transform duration-200 ease-out'
              }`}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          {zoom > MIN_ZOOM && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur sm:flex">
              <Move className="h-3.5 w-3.5" /> Drag to inspect the zoomed image
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-black/25 px-3 py-3 sm:px-6">
          <div className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] p-2 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-5 w-5" />
            </button>

            <div className="min-w-[64px] select-none text-center text-xs font-extrabold tabular-nums text-emerald-200">
              {Math.round(zoom * 100)}%
            </div>

            <button
              type="button"
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            <span className="mx-1 h-7 w-px bg-white/10" aria-hidden="true" />

            <button
              type="button"
              onClick={resetView}
              disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Reset image view"
              title="Reset (0)"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-white/45 sm:text-[11px]">
            Use + / − to zoom. On desktop, Esc closes the viewer. Drag when zoomed to inspect details.
          </p>
        </footer>
      </div>
    </div>
  );
}
