import { connectDB } from "@/lib/db/mongoose";
import { AuditLogModel } from "@/models/supporting";

export async function writeAudit(entry: {
  actorId?: string | null;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await connectDB();
  await AuditLogModel.create({
    actorId: entry.actorId || null,
    actorEmail: entry.actorEmail ?? "",
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? "",
    metadata: entry.metadata ?? {},
  });
}
