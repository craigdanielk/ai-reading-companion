"use client";

import { useActionState } from "react";
import { inviteReader, recoveryLink } from "@/app/actions";

const FIELD = "mt-1 w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[14px] text-ink";

function Result({ state }: { state: { link?: string; email?: string; error?: string } | null }) {
  if (!state) return null;
  if (state.error) return <p className="mt-2 text-[12px] text-danger">{state.error}</p>;
  if (!state.link) return null;
  return (
    <div className="mt-3 rounded-input border border-line bg-paper-2/60 p-3">
      <p className="text-[11.5px] text-muted">
        Send this link to {state.email}. It is single-use and expires.
      </p>
      <code className="mt-2 block break-all text-[11px] leading-relaxed text-ink-soft">{state.link}</code>
    </div>
  );
}

export function AdminAccess() {
  const [inviteState, inviteAction, inviting] = useActionState(inviteReader, null);
  const [resetState, resetAction, resetting] = useActionState(recoveryLink, null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form action={inviteAction} className="rounded-card border border-line p-4">
        <h3 className="font-display text-[14px] font-semibold">Invite a reader</h3>
        <p className="mt-1 text-[11.5px] text-muted">
          Creates the account and hands you a link to pass on. No email is sent.
        </p>
        <input name="email" type="email" required placeholder="reader@example.com" className={FIELD} />
        <button
          type="submit"
          disabled={inviting}
          className="mt-3 rounded-pill bg-ember px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {inviting ? "Creating…" : "Create invite link"}
        </button>
        <Result state={inviteState} />
      </form>

      <form action={resetAction} className="rounded-card border border-line p-4">
        <h3 className="font-display text-[14px] font-semibold">Reset a password</h3>
        <p className="mt-1 text-[11.5px] text-muted">
          For a reader who is locked out. Mints a link they open to set a new password.
        </p>
        <input name="email" type="email" required placeholder="reader@example.com" className={FIELD} />
        <button
          type="submit"
          disabled={resetting}
          className="mt-3 rounded-pill border border-line px-4 py-2 text-[13px] font-medium disabled:opacity-40"
        >
          {resetting ? "Creating…" : "Create reset link"}
        </button>
        <Result state={resetState} />
      </form>
    </div>
  );
}
