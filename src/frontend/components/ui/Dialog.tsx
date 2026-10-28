"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/frontend/components/ui/Button";

/**
 * A native modal dialog. It takes focus when opened and returns it to the trigger when
 * closed.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;

    // Remember the trigger before the native dialog takes keyboard focus.
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}>
      <div className="dialog-body">
        <h2 id={titleId}>{title}</h2>
        {children}
        <Button variant="secondary" type="button" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </dialog>
  );
}
