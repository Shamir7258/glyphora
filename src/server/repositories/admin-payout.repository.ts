import { connectDB } from "@/server/lib/db";
import { PayoutModel } from "@/server/models/payout.model";
import { TransactionModel } from "@/server/models/transaction.model";
import type { PayoutStatus } from "@/types/enums";

export type AdminPayoutListItemDTO = {
  id: string;
  designerId: string;
  designerName: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  method: string | null;
  requestedAt: string;
  processedAt: string | null;
  notes: string | null;
};

export const AdminPayoutRepository = {
  async list(params: { status?: PayoutStatus; page?: number; limit?: number }) {
    await connectDB();
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;

    const [docs, total] = await Promise.all([
      PayoutModel.find(filter)
        .sort({ requestedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "designer", select: "displayName" })
        .lean(),
      PayoutModel.countDocuments(filter),
    ]);

    const items: AdminPayoutListItemDTO[] = docs.map((p) => {
      const doc = p as unknown as {
        _id: unknown;
        designer: { _id: unknown; displayName: string } | null;
        amountCents: number;
        currency: string;
        status: PayoutStatus;
        method: string | null;
        requestedAt: Date;
        processedAt: Date | null;
        notes: string | null;
      };
      return {
        id: String(doc._id),
        designerId: doc.designer ? String(doc.designer._id) : "",
        designerName: doc.designer?.displayName ?? "(unknown designer)",
        amountCents: doc.amountCents,
        currency: doc.currency,
        status: doc.status,
        method: doc.method,
        requestedAt: doc.requestedAt.toISOString(),
        processedAt: doc.processedAt ? doc.processedAt.toISOString() : null,
        notes: doc.notes,
      };
    });

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async findRaw(id: string) {
    await connectDB();
    return PayoutModel.findById(id);
  },

  /**
   * FIFO settlement: the designer's oldest unpaid SALE transactions (payout: null),
   * accumulated until their designerShareCents covers the payout amount. Each
   * Transaction is an atomic unit (never split), so the last transaction pulled in
   * can push the settled total slightly past `amountCents` — acceptable in V1
   * since a designer only ever requests up to their current available balance
   * (see docs/agent-reports/admin-panel.md for the full rationale).
   */
  async findUnpaidSaleTransactionsToSettle(designerId: string, amountCents: number) {
    await connectDB();
    const candidates = await TransactionModel.find({
      type: "SALE",
      designer: designerId,
      payout: null,
    }).sort({ createdAt: 1 });

    const settled: (typeof candidates)[number][] = [];
    let running = 0;
    for (const tx of candidates) {
      if (running >= amountCents) break;
      settled.push(tx);
      running += tx.designerShareCents;
    }
    return { settled, totalSettledCents: running };
  },
};
