import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, disconnectTestDB, clearCollections } from "../setup/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { CategoryModel } from "@/server/models/category.model";
import { FontModel } from "@/server/models/font.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { CartModel } from "@/server/models/cart.model";
import { OrderModel } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { TransactionModel } from "@/server/models/transaction.model";
import { CommissionConfigModel } from "@/server/models/commission-config.model";
import { OrderService } from "@/server/services/order.service";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

async function seedFixtures() {
  const admin = await UserModel.create({ email: "admin@test.local", name: "Admin", roles: ["ADMIN"] });
  const designerUser = await UserModel.create({ email: "designer@test.local", name: "Designer", roles: ["DESIGNER"] });
  const designer = await DesignerProfileModel.create({
    user: designerUser._id,
    username: "test-designer",
    displayName: "Test Designer",
  });
  const category = await CategoryModel.create({ name: "Sans Serif", slug: "sans-serif" });
  const license = await FontLicenseModel.create({
    key: "COMMERCIAL",
    name: "Commercial",
    description: "Commercial use",
    priceMultiplier: 2.5,
    allowedUsage: ["Client work"],
  });
  const font = await FontModel.create({
    slug: "test-font",
    name: "Test Font",
    designer: designer._id,
    productType: "MARKETPLACE",
    category: category._id,
    basePriceCents: 2000, // $20.00
    status: "PUBLISHED",
    publishedAt: new Date(),
    designerName: designer.displayName,
    categoryName: category.name,
  });
  const customer = await UserModel.create({ email: "customer@test.local", name: "Customer", roles: ["CUSTOMER"] });

  await CommissionConfigModel.create({ percentage: 30, effectiveFrom: new Date("2020-01-01"), createdBy: admin._id });

  return { admin, designer, font, license, customer };
}

describe("OrderService.createOrderFromCart", () => {
  beforeEach(async () => {
    await clearCollections([
      UserModel,
      DesignerProfileModel,
      CategoryModel,
      FontModel,
      FontLicenseModel,
      CartModel,
      OrderModel,
      OrderItemModel,
      TransactionModel,
      CommissionConfigModel,
    ]);
  });

  it("snapshots price from the DB (basePrice × license multiplier), not from client input", async () => {
    const { font, license, customer } = await seedFixtures();
    const cart = await CartModel.create({
      owner: { user: customer._id },
      items: [{ font: font._id, license: license._id, unitPriceCents: 1, addedAt: new Date() }], // deliberately wrong price
    });

    const order = await OrderService.createOrderFromCart(cart, { name: customer.name, email: customer.email });

    expect(order.subtotalCents).toBe(5000); // 2000 * 2.5, NOT the cart's bogus 1
    expect(order.status).toBe("PENDING");

    const items = await OrderItemModel.find({ order: order._id });
    expect(items).toHaveLength(1);
    expect(items[0].unitPriceCents).toBe(5000);
    expect(items[0].downloadGranted).toBe(false); // not paid yet
  });

  it("rejects checkout on an empty cart", async () => {
    const { customer } = await seedFixtures();
    const cart = await CartModel.create({ owner: { user: customer._id }, items: [] });
    await expect(OrderService.createOrderFromCart(cart, { name: customer.name, email: customer.email })).rejects.toThrow();
  });

  it("rejects a font that's no longer published", async () => {
    const { font, license, customer } = await seedFixtures();
    await FontModel.findByIdAndUpdate(font._id, { status: "SUSPENDED" });
    const cart = await CartModel.create({
      owner: { user: customer._id },
      items: [{ font: font._id, license: license._id, unitPriceCents: 5000, addedAt: new Date() }],
    });
    await expect(OrderService.createOrderFromCart(cart, { name: customer.name, email: customer.email })).rejects.toThrow();
  });
});

describe("OrderService.markPaid", () => {
  beforeEach(async () => {
    await clearCollections([
      UserModel,
      DesignerProfileModel,
      CategoryModel,
      FontModel,
      FontLicenseModel,
      CartModel,
      OrderModel,
      OrderItemModel,
      TransactionModel,
      CommissionConfigModel,
    ]);
  });

  it("computes the commission split at the rate effective now, grants downloads, and updates designer stats — exactly once even if called twice", async () => {
    const { font, license, designer, customer } = await seedFixtures();
    const cart = await CartModel.create({
      owner: { user: customer._id },
      items: [{ font: font._id, license: license._id, unitPriceCents: 5000, addedAt: new Date() }],
    });
    const order = await OrderService.createOrderFromCart(cart, { name: customer.name, email: customer.email });

    await OrderService.markPaid(order._id.toString(), "sess_test_1", "pi_test_1", "evt_test_1");

    const paidOrder = await OrderModel.findById(order._id);
    expect(paidOrder?.status).toBe("PAID");

    const [item] = await OrderItemModel.find({ order: order._id });
    expect(item.commissionPercentageAtSale).toBe(30);
    expect(item.platformFeeCents).toBe(1500); // 30% of 5000
    expect(item.designerShareCents).toBe(3500);
    expect(item.downloadGranted).toBe(true);

    const transactions = await TransactionModel.find({ order: order._id });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe("SALE");
    expect(transactions[0].netAmountCents).toBe(3500);

    const updatedFont = await FontModel.findById(font._id);
    expect(updatedFont?.salesCount).toBe(1);

    const updatedDesigner = await DesignerProfileModel.findById(designer._id);
    expect(updatedDesigner?.stats?.totalSalesCount).toBe(1);
    expect(updatedDesigner?.stats?.totalRevenueCents).toBe(3500);

    // Idempotency: a duplicate webhook delivery for the same order must not
    // double-count sales, revenue, or create a second Transaction.
    await OrderService.markPaid(order._id.toString(), "sess_test_1", "pi_test_1", "evt_test_2_replay");

    const transactionsAfterReplay = await TransactionModel.find({ order: order._id });
    expect(transactionsAfterReplay).toHaveLength(1);

    const fontAfterReplay = await FontModel.findById(font._id);
    expect(fontAfterReplay?.salesCount).toBe(1);

    const designerAfterReplay = await DesignerProfileModel.findById(designer._id);
    expect(designerAfterReplay?.stats?.totalSalesCount).toBe(1);
    expect(designerAfterReplay?.stats?.totalRevenueCents).toBe(3500);
  });

  it("uses the commission rate effective at payment time, not a rate changed afterwards", async () => {
    const { font, license, customer, admin } = await seedFixtures();
    const cart = await CartModel.create({
      owner: { user: customer._id },
      items: [{ font: font._id, license: license._id, unitPriceCents: 5000, addedAt: new Date() }],
    });
    const order = await OrderService.createOrderFromCart(cart, { name: customer.name, email: customer.email });
    await OrderService.markPaid(order._id.toString(), "sess_test_2", "pi_test_2", "evt_test_3");

    // Commission changes AFTER the sale...
    await CommissionConfigModel.create({ percentage: 10, effectiveFrom: new Date(), createdBy: admin._id });

    // ...but the already-settled OrderItem/Transaction must be untouched.
    const [item] = await OrderItemModel.find({ order: order._id });
    expect(item.commissionPercentageAtSale).toBe(30);
    const [transaction] = await TransactionModel.find({ order: order._id });
    expect(transaction.commissionPercentageUsed).toBe(30);
  });
});
