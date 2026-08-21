import { connectDB } from "@/server/lib/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import type { AccountStatus } from "@/types/enums";

export type AdminCustomerListItemDTO = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: AccountStatus;
  createdAt: string;
};

export type AdminDesignerListItemDTO = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  isPlatform: boolean;
  status: AccountStatus;
  fontCount: number;
  stats: { totalProducts: number; totalSalesCount: number; totalRevenueCents: number };
  createdAt: string;
};

export const AdminUserRepository = {
  async listCustomers(params: { page?: number; limit?: number; q?: string }) {
    await connectDB();
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.q) {
      filter.$or = [
        { name: { $regex: params.q, $options: "i" } },
        { email: { $regex: params.q, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const items: AdminCustomerListItemDTO[] = docs.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      roles: u.roles,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async setCustomerStatus(id: string, status: AccountStatus) {
    await connectDB();
    const before = await UserModel.findById(id).lean();
    if (!before) return null;
    const after = await UserModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
    return { before, after };
  },

  async listDesigners(params: { page?: number; limit?: number; q?: string }) {
    await connectDB();
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.q) {
      filter.$or = [
        { displayName: { $regex: params.q, $options: "i" } },
        { username: { $regex: params.q, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      DesignerProfileModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "user", select: "email" })
        .lean(),
      DesignerProfileModel.countDocuments(filter),
    ]);

    const items: AdminDesignerListItemDTO[] = await Promise.all(
      docs.map(async (d) => {
        const doc = d as unknown as {
          _id: unknown;
          user: { _id: unknown; email: string } | null;
          username: string;
          displayName: string;
          isPlatform: boolean;
          status: AccountStatus;
          stats: { totalProducts: number; totalSalesCount: number; totalRevenueCents: number };
          createdAt: Date;
        };
        const fontCount = await FontModel.countDocuments({ designer: doc._id });
        return {
          id: String(doc._id),
          userId: doc.user ? String(doc.user._id) : "",
          username: doc.username,
          displayName: doc.displayName,
          email: doc.user?.email ?? "",
          isPlatform: doc.isPlatform,
          status: doc.status,
          fontCount,
          stats: {
            totalProducts: doc.stats?.totalProducts ?? 0,
            totalSalesCount: doc.stats?.totalSalesCount ?? 0,
            totalRevenueCents: doc.stats?.totalRevenueCents ?? 0,
          },
          createdAt: doc.createdAt.toISOString(),
        };
      })
    );

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async setDesignerStatus(id: string, status: AccountStatus) {
    await connectDB();
    const before = await DesignerProfileModel.findById(id).lean();
    if (!before) return null;
    const after = await DesignerProfileModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
    return { before, after };
  },
};
