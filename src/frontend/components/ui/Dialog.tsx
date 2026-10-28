"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/frontend/components/ui/Button";
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
