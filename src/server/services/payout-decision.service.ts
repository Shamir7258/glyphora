import { connectDB } from "@/server/lib/db";
import { AdminPayoutRepository } from "@/server/repositories/admin-payout.repository";
import { TransactionModel } from "@/server/models/transaction.model";
import { ApiError } from "@/types/errors";
import type { PayoutStatus } from "@/types/enums";

// Admin-only payout decision logic, deliberately its own file rather than a shared
// payout.service.ts: the designer-facing "request a payout" flow (owned by the
// parallel designer-experience agent) creates Payout rows directly via
// PayoutModel.create({status:'REQUESTED'}) rather than through a shared service
// (see task brief) — this file only ever moves a payout forward from that point,
// so there is nothing for the two agents to collide on.

const ALLOWED_NEXT: Record<PayoutStatus, PayoutStatus[]> = {
  REQUESTED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["PAID", "REJECTED"],
  PAID: [],
  REJECTED: [],
};

export const PayoutDecisionService = {
  async decide(payoutId: string, adminUserId: string, next: "PROCESSING" | "PAID" | "REJECTED", notes?: string) {
    await connectDB();
    const payout = await AdminPayoutRepository.findRaw(payoutId);
    if (!payout) throw ApiError.notFound("Payout not found.");

    const allowed = ALLOWED_NEXT[payout.status as PayoutStatus] ?? [];
    if (!allowed.includes(next)) {
      throw ApiError.conflict(`Cannot move a payout from ${payout.status} to ${next}.`);
    }

    const before = payout.toObject();

    if (next === "PAID") {
      const { settled, totalSettledCents } = await AdminPayoutRepository.findUnpaidSaleTransactionsToSettle(
        String(payout.designer),
        payout.amountCents
      );

      const payoutTransaction = await TransactionModel.create({
        type: "PAYOUT",
        designer: payout.designer,
        grossAmountCents: payout.amountCents,
        platformFeeCents: 0,
        designerShareCents: payout.amountCents,
        netAmountCents: -payout.amountCents,
        currency: payout.currency,
        payout: payout._id,
      });

      if (settled.length > 0) {
        await TransactionModel.updateMany(
          { _id: { $in: settled.map((s) => s._id) } },
          { $set: { payout: payout._id } }
        );
      }

      payout.transactions = [
        payoutTransaction._id,
        ...settled.map((s) => s._id),
      ] as unknown as typeof payout.transactions;
      payout.processedAt = new Date();
      void totalSettledCents;
    }

    payout.status = next;
    payout.processedBy = adminUserId as unknown as typeof payout.processedBy;
    if (next !== "PAID") payout.processedAt = new Date();
    if (notes) payout.notes = notes;

    await payout.save();

    return { before, after: payout.toObject() };
  },
};
