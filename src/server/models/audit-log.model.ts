import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel: Model<AuditLogDoc> =
  models.AuditLog ?? model<AuditLogDoc>("AuditLog", auditLogSchema);
