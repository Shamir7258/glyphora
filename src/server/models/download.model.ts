import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const downloadSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    order: { type: Types.ObjectId, ref: "Order", required: true },
    orderItem: { type: Types.ObjectId, ref: "OrderItem", required: true, index: true },
    font: { type: Types.ObjectId, ref: "Font", required: true },
    fontFile: { type: Types.ObjectId, ref: "FontFile", required: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: "downloadedAt", updatedAt: false } }
);

downloadSchema.index({ user: 1, downloadedAt: -1 });

export type DownloadDoc = InferSchemaType<typeof downloadSchema>;
export const DownloadModel: Model<DownloadDoc> = models.Download ?? model<DownloadDoc>("Download", downloadSchema);
