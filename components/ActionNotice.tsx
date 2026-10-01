const MESSAGES: Record<string, string> = {
  saved: "Saved.",
  "note-saved": "Note saved.",
  "note-deleted": "Note deleted.",
  deleted: "Text deleted.",
  connected: "Provider connected.",
  removed: "Provider removed.",
  error: "That change could not be saved. Please try again.",
};

export function ActionNotice({ notice }: { notice?: string }) {
  const message = notice ? MESSAGES[notice] : null;
  if (!message) return null;
  return <p role="status" className={"rounded-input px-3 py-2 text-[13px] " + (notice === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-ink")}>{message}</p>;
}
