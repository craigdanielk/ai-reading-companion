"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className={className + " min-h-11 disabled:opacity-50"}>{pending ? pendingLabel : label}</button>;
}

export function ConfirmDeleteButton({ label, question, className }: { label: string; question: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => { if (!window.confirm(question)) event.preventDefault(); }}
      className={className + " min-h-11 disabled:opacity-50"}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
