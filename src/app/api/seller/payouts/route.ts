import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { payoutRequestSchema } from "@/types/schemas/seller.schema";
import { connectDB } from "@/server/lib/db";
import { PayoutModel } from "@/server/models/payout.model";
import { SiteSettingModel } from "@/server/models/site-setting.model";
import { TransactionModel } from "@/server/models/transaction.model";
import { SellerEarningsService } from "@/server/services/seller-earnings.service";
import { ApiError } from "@/types/errors";

/**
 * Deliberately NOT routed through a shared payout.service.ts — the admin agent
 * independently builds the approval side (PATCH /api/admin/payouts/[id]) in its
 * own worktree, and a shared write-side service file would be a guaranteed
 * collision point between the two parallel worktrees (per the task brief). This
 * route reads via SellerEarningsService (read-only, safe to share) but writes
 * (Payout/Transaction updates) directly.
 */

/** GET /api/seller/payouts — this designer's payout history. */
export const GET = withApiHandler(async () => {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const payouts = await PayoutModel.find({ designer: designerProfileId }).sort({ requestedAt: -1 }).lean();

  return apiOk(
    payouts.map((p) => ({
      id: p._id.toString(),
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      method: p.method,
      requestedAt: p.requestedAt.toISOString(),
      processedAt: p.processedAt ? p.processedAt.toISOString() : null,
      notes: p.notes,
    }))
  );
});

/** POST /api/seller/payouts — { amountCents } → Payout (status REQUESTED). */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { designerProfileId } = await requireDesignerProfileId();
  const body = await request.json();
  const { amountCents } = payoutRequestSchema.parse(body);
  await connectDB();

  const minSetting = await SiteSettingModel.findOne({ key: "payout.minimumAmountCents" }).lean();
  const minimumAmountCents = typeof minSetting?.value === "number" ? minSetting.value : 5000;

  if (amountCents < minimumAmountCents) {
    throw ApiError.validation(
      `The minimum payout request is ${(minimumAmountCents / 100).toFixed(2)} USD.`,
      { amountCents: [`Minimum is $${(minimumAmountCents / 100).toFixed(2)}.`] }
    );
  }

  const { availableCents } = await SellerEarningsService.getBalance(designerProfileId);
  if (amountCents > availableCents) {
    throw ApiError.validation("That's more than your available balance.", {
      amountCents: [`Only $${(availableCents / 100).toFixed(2)} is available.`],
    });
  }

  // Consume oldest-first un-attached SALE transactions until they cover the
  // requested amount — this is what makes "available balance" accurate (a
  // transaction can't be claimed by two simultaneous payout requests). The
  // stored Payout.amountCents is the sum actually attached, which may run
  // slightly above what was typed since transactions aren't split — see
  // docs/agent-reports/designer-experience.md for the reasoning.
  const availableTxs = await SellerEarningsService.getAvailableTransactions(designerProfileId);
  const attached: typeof availableTxs = [];
  let attachedTotal = 0;
  for (const tx of availableTxs) {
    if (attachedTotal >= amountCents) break;
    attached.push(tx);
    attachedTotal += tx.netAmountCents;
  }

  if (attachedTotal < amountCents) {
    // Shouldn't happen given the availableCents check above, but guards against
    // a race between the balance check and this loop.
    throw ApiError.conflict("Your available balance changed — please refresh and try again.");
  }

  const payout = await PayoutModel.create({
    designer: designerProfileId,
    amountCents: attachedTotal,
    currency: "USD",
    status: "REQUESTED",
    transactions: attached.map((tx) => tx._id),
  });

  await Promise.all(
    attached.map((tx) => TransactionModel.findByIdAndUpdate(tx._id, { payout: payout._id }))
  );

  return apiOk(
    {
      id: payout._id.toString(),
      amountCents: payout.amountCents,
      currency: payout.currency,
      status: payout.status,
      requestedAt: payout.requestedAt.toISOString(),
    },
    201
  );
});
