import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { TransactionModel } from "@/server/models/transaction.model";
import { SellerEarningsService } from "@/server/services/seller-earnings.service";

/** GET /api/seller/earnings — { availableCents, pendingCents, paidCents } + Transaction[] (docs/API_CONTRACTS.md). */
export const GET = withApiHandler(async () => {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const [balance, transactions] = await Promise.all([
    SellerEarningsService.getBalance(designerProfileId),
    TransactionModel.find({ designer: designerProfileId }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  return apiOk({
    ...balance,
    currency: "USD",
    transactions: transactions.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      grossAmountCents: t.grossAmountCents,
      platformFeeCents: t.platformFeeCents,
      netAmountCents: t.netAmountCents,
      commissionPercentageUsed: t.commissionPercentageUsed,
      currency: t.currency,
      payoutId: t.payout ? t.payout.toString() : null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});
