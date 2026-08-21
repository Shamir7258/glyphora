import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, disconnectTestDB, clearCollections } from "../setup/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { CategoryModel } from "@/server/models/category.model";
import { FontModel } from "@/server/models/font.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { OrderModel } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { DownloadModel } from "@/server/models/download.model";
import { DownloadService } from "@/server/services/storage/download.service";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await clearCollections([
    UserModel,
    DesignerProfileModel,
    CategoryModel,
    FontModel,
    FontFileModel,
    FontLicenseModel,
    OrderModel,
    OrderItemModel,
    DownloadModel,
  ]);
});

async function seedPurchase(overrides: { orderStatus?: string; downloadGranted?: boolean } = {}) {
  const buyer = await UserModel.create({ email: "buyer@test.local", name: "Buyer", roles: ["CUSTOMER"] });
  const otherUser = await UserModel.create({ email: "other@test.local", name: "Other", roles: ["CUSTOMER"] });
  const designerUser = await UserModel.create({ email: "d@test.local", name: "D", roles: ["DESIGNER"] });
  const designer = await DesignerProfileModel.create({ user: designerUser._id, username: "d", displayName: "D" });
  const category = await CategoryModel.create({ name: "Serif", slug: "serif" });
  const license = await FontLicenseModel.create({
    key: "PERSONAL",
    name: "Personal",
    description: "Personal use",
    priceMultiplier: 1,
  });
  const font = await FontModel.create({
    slug: "dl-test-font",
    name: "DL Test Font",
    designer: designer._id,
    productType: "MARKETPLACE",
    category: category._id,
    basePriceCents: 1000,
    status: "PUBLISHED",
    publishedAt: new Date(),
  });
  const fontFile = await FontFileModel.create({
    font: font._id,
    purpose: "DELIVERABLE",
    format: "TTF",
    storageKey: "test/dl-test-font.ttf",
    fileSizeBytes: 1234,
    checksumSha256: "a".repeat(64),
    originalFilename: "dl-test-font.ttf",
    uploadedBy: designerUser._id,
    validated: true,
  });
  const previewFile = await FontFileModel.create({
    font: font._id,
    purpose: "PREVIEW",
    format: "TTF",
    storageKey: "test/dl-test-font-preview.ttf",
    fileSizeBytes: 1234,
    checksumSha256: "b".repeat(64),
    originalFilename: "dl-test-font-preview.ttf",
    uploadedBy: designerUser._id,
    validated: true,
  });

  const order = await OrderModel.create({
    orderNumber: "GLY-TEST-0001",
    user: buyer._id,
    customerInfo: { name: buyer.name, email: buyer.email },
    items: [],
    subtotalCents: 1000,
    grandTotalCents: 1000,
    status: overrides.orderStatus ?? "PAID",
  });
  const orderItem = await OrderItemModel.create({
    order: order._id,
    font: font._id,
    license: license._id,
    designer: designer._id,
    unitPriceCents: 1000,
    lineTotalCents: 1000,
    commissionPercentageAtSale: 30,
    designerShareCents: 700,
    platformFeeCents: 300,
    downloadGranted: overrides.downloadGranted ?? true,
  });

  return { buyer, otherUser, font, fontFile, previewFile, order, orderItem };
}

describe("DownloadService.authorizeAndIssue", () => {
  it("issues a signed URL and records a Download for a valid PAID, downloadGranted purchase", async () => {
    const { buyer, orderItem, fontFile } = await seedPurchase();

    const url = await DownloadService.authorizeAndIssue({
      userId: buyer._id.toString(),
      orderItemId: orderItem._id.toString(),
      fontFileId: fontFile._id.toString(),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);

    const downloads = await DownloadModel.find({ orderItem: orderItem._id });
    expect(downloads).toHaveLength(1);
    expect(downloads[0].user.toString()).toBe(buyer._id.toString());
  });

  it("rejects a user who didn't place the order", async () => {
    const { otherUser, orderItem, fontFile } = await seedPurchase();
    await expect(
      DownloadService.authorizeAndIssue({
        userId: otherUser._id.toString(),
        orderItemId: orderItem._id.toString(),
        fontFileId: fontFile._id.toString(),
        ipAddress: null,
        userAgent: null,
      })
    ).rejects.toThrow();
  });

  it("rejects an order that hasn't completed payment", async () => {
    const { buyer, orderItem, fontFile } = await seedPurchase({ orderStatus: "PENDING" });
    await expect(
      DownloadService.authorizeAndIssue({
        userId: buyer._id.toString(),
        orderItemId: orderItem._id.toString(),
        fontFileId: fontFile._id.toString(),
        ipAddress: null,
        userAgent: null,
      })
    ).rejects.toThrow();
  });

  it("rejects when downloadGranted is false even if the order is PAID (e.g. before webhook finishes)", async () => {
    const { buyer, orderItem, fontFile } = await seedPurchase({ downloadGranted: false });
    await expect(
      DownloadService.authorizeAndIssue({
        userId: buyer._id.toString(),
        orderItemId: orderItem._id.toString(),
        fontFileId: fontFile._id.toString(),
        ipAddress: null,
        userAgent: null,
      })
    ).rejects.toThrow();
  });

  it("rejects requesting the PREVIEW file through the purchased-download path", async () => {
    const { buyer, orderItem, previewFile } = await seedPurchase();
    await expect(
      DownloadService.authorizeAndIssue({
        userId: buyer._id.toString(),
        orderItemId: orderItem._id.toString(),
        fontFileId: previewFile._id.toString(),
        ipAddress: null,
        userAgent: null,
      })
    ).rejects.toThrow();
  });
});
