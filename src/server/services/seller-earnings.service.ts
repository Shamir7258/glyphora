import { connectDB } from "@/server/lib/db";
import { TransactionModel } from "@/server/models/transaction.model";
import { PayoutModel } from "@/server/models/payout.model";

/**
 * Read-only balance calculation shared by GET /api/seller/earnings and
 * POST /api/seller/payouts (both in src/app/api/seller/**, owned by the
 * designer-experience agent). This is deliberately NOT a payout.service.ts —
 * the admin agent independently builds the payout *approval* side in its own
 * worktree, and a shared write-side service file would be a collision point
 * between the two worktrees (see the task brief). This file only reads.
 *
 * Balance definitions (documented decision, see docs/agent-reports/designer-experience.md):
 * - availableCents: sum of SALE transaction netAmountCents not yet attached to
 *   any Payout (Transaction.payout is set the moment a payout REQUEST consumes
 *   it — see POST /api/seller/payouts — so a designer can't request the same
 *   money twice before an admin processes it).
 * - pendingCents: 0 in V1 — no hold-period is implemented, so a settled SALE
 *   transaction is immediately available. A real hold period (e.g. 14 days
 *   post-sale for chargeback risk) is a documented V2 follow-up.
 * - paidCents: sum of amountCents across this designer's PAID payouts.
 */
export const SellerEarningsService = {
  async getBalance(designerId: string) {
    await connectDB();
    const [availableTxs, paidPayouts] = await Promise.all([
      TransactionModel.find({ designer: designerId, type: "SALE", payout: null }).lean(),
      PayoutModel.find({ designer: designerId, status: "PAID" }).lean(),
    ]);

    const availableCents = availableTxs.reduce((sum, t) => sum + t.netAmountCents, 0);
    const paidCents = paidPayouts.reduce((sum, p) => sum + p.amountCents, 0);

    return { availableCents, pendingCents: 0, paidCents };
  },

  /** Oldest-first SALE transactions currently available (not yet attached to a payout). */
  async getAvailableTransactions(designerId: string) {
    await connectDB();
    return TransactionModel.find({ designer: designerId, type: "SALE", payout: null }).sort({ createdAt: 1 });
  },
};
