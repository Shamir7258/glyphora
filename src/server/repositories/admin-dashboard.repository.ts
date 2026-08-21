import { connectDB } from "@/server/lib/db";
import { OrderModel } from "@/server/models/order.model";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import { TransactionModel } from "@/server/models/transaction.model";

export type MonthlyRevenuePoint = { month: string; revenueCents: number; orders: number };
export type StatusBreakdownPoint = { status: string; count: number };

export type AdminDashboardSummary = {
  revenueCents: number;
  orderCount: number;
  customerCount: number;
  designerCount: number;
  pendingApprovalCount: number;
  platformFeeCents: number;
  revenueByMonth: MonthlyRevenuePoint[];
  fontsByStatus: StatusBreakdownPoint[];
};

// Direct-model admin queries, per docs/DEVELOPMENT.md task scope: admin views don't
// need to route through the customer-facing repositories other agents own — this
// repository exists solely so the dashboard route/page stay in the
// route->service/repository->model layering the architecture doc requires, without
// touching FontRepository/OrderRepository files another agent may also be editing.
export const AdminDashboardRepository = {
  async getSummary(): Promise<AdminDashboardSummary> {
    await connectDB();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      revenueAgg,
      orderCount,
      customerCount,
      designerCount,
      pendingApprovalCount,
      revenueByMonthAgg,
      fontsByStatusAgg,
    ] = await Promise.all([
      OrderModel.aggregate([
        { $match: { status: "PAID" } },
        { $group: { _id: null, revenue: { $sum: "$grandTotalCents" } } },
      ]),
      OrderModel.countDocuments({ status: "PAID" }),
      UserModel.countDocuments({}),
      DesignerProfileModel.countDocuments({}),
      FontModel.countDocuments({ status: "PENDING_REVIEW" }),
      OrderModel.aggregate([
        { $match: { status: "PAID", createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            revenue: { $sum: "$grandTotalCents" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      FontModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const platformFeeAgg = await TransactionModel.aggregate([
      { $match: { type: "SALE" } },
      { $group: { _id: null, fee: { $sum: "$platformFeeCents" } } },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const revenueByMonth: MonthlyRevenuePoint[] = revenueByMonthAgg.map(
      (r: { _id: { y: number; m: number }; revenue: number; orders: number }) => ({
        month: `${monthNames[r._id.m - 1]} ${r._id.y}`,
        revenueCents: r.revenue,
        orders: r.orders,
      })
    );

    const fontsByStatus: StatusBreakdownPoint[] = fontsByStatusAgg.map((s: { _id: string; count: number }) => ({
      status: s._id,
      count: s.count,
    }));

    return {
      revenueCents: revenueAgg[0]?.revenue ?? 0,
      orderCount,
      customerCount,
      designerCount,
      pendingApprovalCount,
      platformFeeCents: platformFeeAgg[0]?.fee ?? 0,
      revenueByMonth,
      fontsByStatus,
    };
  },
};
