import { connectDB } from "@/server/lib/db";
import { CartModel } from "@/server/models/cart.model";
import { OrderModel } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { PaymentModel } from "@/server/models/payment.model";
import { TransactionModel } from "@/server/models/transaction.model";
import { FontModel } from "@/server/models/font.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { CommissionService } from "@/server/services/commission.service";
import { paymentProvider } from "@/server/services/payment";
import { ApiError } from "@/types/errors";
import { nanoid } from "nanoid";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GLY-${date}-${nanoid(6).toUpperCase()}`;
}

export const OrderService = {
  /** Creates a PENDING Order + OrderItems from a Cart, snapshotting prices from the DB — never from client input. */
  async createOrderFromCart(cart: InstanceType<typeof CartModel>, customerInfo: { name: string; email: string }) {
    await connectDB();
    if (cart.items.length === 0) throw ApiError.validation("Your cart is empty.");

    const orderItemsData = [];
    let subtotalCents = 0;

    for (const item of cart.items) {
      const font = await FontModel.findById(item.font);
      if (!font || font.status !== "PUBLISHED") {
        throw ApiError.conflict(`"${font?.name ?? "A font"}" in your cart is no longer available.`);
      }
      const license = await FontLicenseModel.findById(item.license);
      if (!license || !license.isActive) throw ApiError.conflict("Selected license is no longer available.");

      const unitPriceCents = Math.round(font.basePriceCents * license.priceMultiplier);
      subtotalCents += unitPriceCents;

      orderItemsData.push({
        font: font._id,
        variant: item.variant ?? null,
        license: license._id,
        designer: font.designer,
        unitPriceCents,
        quantity: 1,
        lineTotalCents: unitPriceCents,
      });
    }

    const order = await OrderModel.create({
      orderNumber: generateOrderNumber(),
      user: cart.owner?.user ?? null,
      customerInfo,
      items: [],
      subtotalCents,
      discountCents: 0,
      taxCents: 0,
      processingFeeCents: 0,
      grandTotalCents: subtotalCents,
      currency: "USD",
      status: "PENDING",
    });

    const orderItems = await OrderItemModel.insertMany(
      orderItemsData.map((d) => ({
        ...d,
        order: order._id,
        // Commission split is computed at PAYMENT SUCCESS, not here — see
        // markPaid(). These are placeholders until then.
        commissionPercentageAtSale: 0,
        designerShareCents: 0,
        platformFeeCents: 0,
      }))
    );

    // Mongoose's inferred type for a `[{ type: ObjectId, ref: ... }]` path is a
    // DocumentArray of subdocuments, not a plain ObjectId[] — but a plain array of
    // ids is exactly what Mongoose expects and casts correctly at runtime here.
    order.items = orderItems.map((i) => i._id) as unknown as typeof order.items;
    await order.save();

    return order;
  },

  async startCheckout(order: InstanceType<typeof OrderModel>, baseUrl: string) {
    const items = await OrderItemModel.find({ order: order._id })
      .populate<{ font: { name: string } }>("font", "name")
      .populate<{ license: { name: string } }>("license", "name");

    const { url, providerSessionId } = await paymentProvider.createCheckoutSession({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      currency: order.currency,
      customerEmail: order.customerInfo!.email,
      lineItems: items.map((item) => ({
        name: item.font.name,
        description: `License: ${item.license.name}`,
        amountCents: item.lineTotalCents,
        quantity: item.quantity,
      })),
      successUrl: `${baseUrl}/checkout/success?order=${order.orderNumber}`,
      cancelUrl: `${baseUrl}/cart`,
    });

    await PaymentModel.create({
      order: order._id,
      providerSessionId,
      status: "REQUIRES_PAYMENT",
      amountCents: order.grandTotalCents,
      currency: order.currency,
    });

    return url;
  },

  /**
   * The ONLY place an order transitions to PAID — called exclusively from the
   * verified Stripe webhook handler, never from the client-facing success page
   * (spec §61: "never rely only on frontend payment success"). Idempotent: guarded
   * by Payment.providerPaymentId's unique index at the DB layer, plus an explicit
   * status check here.
   */
  async markPaid(orderId: string, providerSessionId: string, providerPaymentId: string, eventId: string) {
    await connectDB();
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error(`markPaid: order ${orderId} not found`);
    if (order.status === "PAID") return order; // already processed — idempotent no-op

    const payment = await PaymentModel.findOne({ order: order._id, providerSessionId });
    if (payment) {
      if (payment.providerPaymentId === providerPaymentId) return order; // exact replay
      payment.providerPaymentId = providerPaymentId;
      payment.status = "SUCCEEDED";
      payment.webhookEventLog.push({ eventId, eventType: "checkout.session.completed", receivedAt: new Date() });
      await payment.save();
    }

    const percentage = await CommissionService.getEffectivePercentage();
    const orderItems = await OrderItemModel.find({ order: order._id });

    for (const item of orderItems) {
      const split = CommissionService.splitAmount(item.lineTotalCents, percentage);
      item.commissionPercentageAtSale = split.percentage;
      item.designerShareCents = split.designerShareCents;
      item.platformFeeCents = split.platformFeeCents;
      item.downloadGranted = true;
      await item.save();

      await TransactionModel.create({
        type: "SALE",
        order: order._id,
        orderItem: item._id,
        designer: item.designer,
        grossAmountCents: item.lineTotalCents,
        platformFeeCents: split.platformFeeCents,
        designerShareCents: split.designerShareCents,
        netAmountCents: split.designerShareCents,
        commissionPercentageUsed: split.percentage,
        currency: order.currency,
      });

      await FontModel.findByIdAndUpdate(item.font, { $inc: { salesCount: 1 } });
      await DesignerProfileModel.findByIdAndUpdate(item.designer, {
        $inc: { "stats.totalSalesCount": 1, "stats.totalRevenueCents": split.designerShareCents },
      });
    }

    order.status = "PAID";
    await order.save();
    return order;
  },
};
