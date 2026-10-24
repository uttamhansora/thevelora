import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSession } from "@/lib/auth/session";
import { DatabaseConfigError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let databaseMessage = "";
  try {
    session = await getSession();
  } catch (error) {
    if (error instanceof DatabaseConfigError) databaseMessage = error.message;
    else redirect("/admin/login");
  }
  if (databaseMessage) {
    return <main className="mx-auto max-w-xl p-8"><h1 className="font-serif text-4xl">Database unavailable</h1><p className="mt-3">{databaseMessage}</p></main>;
  }
  if (!session) redirect("/admin/login");
  return <AdminShell session={session}>{children}</AdminShell>;
}
