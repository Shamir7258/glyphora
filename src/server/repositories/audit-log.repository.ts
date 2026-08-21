import { connectDB } from "@/server/lib/db";
import { AuditLogModel } from "@/server/models/audit-log.model";

export type AuditLogItemDTO = {
  id: string;
  actorName: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
};

export const AuditLogRepository = {
  async list(params: { entityType?: string; page?: number; limit?: number }) {
    await connectDB();
    const limit = params.limit ?? 30;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.entityType) filter.entityType = params.entityType;

    const [docs, total, entityTypes] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "actor", select: "name email" })
        .lean(),
      AuditLogModel.countDocuments(filter),
      AuditLogModel.distinct("entityType"),
    ]);

    const items: AuditLogItemDTO[] = docs.map((l) => {
      const doc = l as unknown as {
        _id: unknown;
        actor: { _id: unknown; name: string; email: string } | null;
        action: string;
        entityType: string;
        entityId: string;
        before: unknown;
        after: unknown;
        ip: string | null;
        createdAt: Date;
      };
      return {
        id: String(doc._id),
        actorId: doc.actor ? String(doc.actor._id) : null,
        actorName: doc.actor ? `${doc.actor.name} <${doc.actor.email}>` : null,
        action: doc.action,
        entityType: doc.entityType,
        entityId: doc.entityId,
        before: doc.before,
        after: doc.after,
        ip: doc.ip,
        createdAt: doc.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      entityTypes: entityTypes.sort() as string[],
    };
  },
};
