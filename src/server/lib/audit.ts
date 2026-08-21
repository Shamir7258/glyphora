import { connectDB } from "@/server/lib/db";
import { AuditLogModel } from "@/server/models/audit-log.model";

export async function writeAuditLog(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  await connectDB();
  await AuditLogModel.create({
    actor: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
    ip: params.ip ?? null,
  });
}
