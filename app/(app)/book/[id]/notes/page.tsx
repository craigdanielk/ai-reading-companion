import { redirect } from "next/navigation";

/** Preserve old notebook links while all answers and personal notes live together. */
export default async function LegacyNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect("/saved?book=" + encodeURIComponent(id));
}
