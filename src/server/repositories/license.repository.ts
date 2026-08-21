import { connectDB } from "@/server/lib/db";
import { FontLicenseModel } from "@/server/models/font-license.model";
import type { LicenseDTO } from "@/types/dto";

export const LicenseRepository = {
  async listActive(): Promise<LicenseDTO[]> {
    await connectDB();
    const docs = await FontLicenseModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    return docs.map((l) => ({
      id: l._id.toString(),
      key: l.key,
      name: l.name,
      description: l.description,
      priceMultiplier: l.priceMultiplier,
      allowedUsage: l.allowedUsage,
      restrictions: l.restrictions,
    }));
  },
};
