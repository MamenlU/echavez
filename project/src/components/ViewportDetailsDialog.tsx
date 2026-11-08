import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ViewportDetailsDialogProps = {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Portals staff detail dialogs outside transformed/animated dashboard panels.
 * Prevents modals appearing below long tables and traps keyboard focus.
 */
export function ViewportDetailsDialog({ titleId, onClose, children }: ViewportDetailsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandler.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const dialog = dialogRef.current;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        if (first === last) first.focus();
        else last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div ref={dialogRef} tabIndex={-1}
      role="dialog" aria-modal="true" aria-labelledby={titleId}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={event => { if (event.currentTarget === event.target) closeHandler.current(); }}>
      <div className="max-h-[min(90dvh,90vh)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-3xl border border-[#DDE6E0] bg-white shadow-2xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}
