import { connectDB } from "@/server/lib/db";
import { CartModel, type CartDoc } from "@/server/models/cart.model";
import { FontModel } from "@/server/models/font.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { CouponModel } from "@/server/models/coupon.model";
import { FontRepository } from "@/server/repositories/font.repository";
import { StorageService } from "@/server/services/storage/storage.service";
import { ApiError } from "@/types/errors";
import type { HydratedDocument } from "mongoose";
import type { CartDTO, CartItemDTO, FontVariantDTO, LicenseDTO } from "@/types/dto";

export type CartOwner = { userId?: string | null; guestId?: string | null };

function ownerFilter(owner: CartOwner): Record<string, unknown> {
  if (owner.userId) return { "owner.user": owner.userId };
  if (owner.guestId) return { "owner.guestId": owner.guestId };
  throw ApiError.validation("Missing cart owner.");
}

type CartHydrated = HydratedDocument<CartDoc>;

export const CartRepository = {
  async findOrCreate(owner: CartOwner): Promise<CartHydrated> {
    await connectDB();
    const filter = ownerFilter(owner);
    let cart = await CartModel.findOne(filter);
    if (!cart) {
      cart = await CartModel.create({
        owner: { user: owner.userId ?? null, guestId: owner.userId ? null : (owner.guestId ?? null) },
        items: [],
      });
    }
    return cart;
  },

  async find(owner: CartOwner): Promise<CartHydrated | null> {
    await connectDB();
    return CartModel.findOne(ownerFilter(owner));
  },

  async addItem(
    owner: CartOwner,
    input: { fontId: string; licenseId: string; variantId?: string }
  ): Promise<CartHydrated> {
    await connectDB();
    const font = await FontModel.findOne({ _id: input.fontId, status: "PUBLISHED" });
    if (!font) throw ApiError.notFound("This font isn't available.");
    const license = await FontLicenseModel.findOne({ _id: input.licenseId, isActive: true });
    if (!license) throw ApiError.notFound("This license isn't available.");

    let variantId: string | null = null;
    if (input.variantId) {
      const variant = await FontVariantModel.findOne({ _id: input.variantId, font: font._id });
      if (!variant) throw ApiError.notFound("That style isn't available for this font.");
      variantId = variant._id.toString();
    }

    const cart = await this.findOrCreate(owner);
    const unitPriceCents = Math.round(font.basePriceCents * license.priceMultiplier);

    const alreadyInCart = cart.items.some(
      (i) =>
        i.font.toString() === font._id.toString() &&
        i.license.toString() === license._id.toString() &&
        (i.variant?.toString() ?? null) === variantId
    );
    if (!alreadyInCart) {
      cart.items.push({
        font: font._id,
        license: license._id,
        variant: variantId,
        unitPriceCents,
        addedAt: new Date(),
      });
      await cart.save();
    }
    return cart;
  },

  async removeItem(owner: CartOwner, itemId: string): Promise<CartHydrated> {
    await connectDB();
    const cart = await this.find(owner);
    if (!cart) throw ApiError.notFound("Cart not found.");
    const subdoc = cart.items.id(itemId);
    if (!subdoc) throw ApiError.notFound("That item isn't in your cart.");
    subdoc.deleteOne();
    await cart.save();
    return cart;
  },

  async applyCoupon(owner: CartOwner, code: string): Promise<CartHydrated> {
    await connectDB();
    const cart = await this.find(owner);
    if (!cart) throw ApiError.notFound("Cart not found.");
    if (cart.items.length === 0) throw ApiError.validation("Add something to your cart first.");

    const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!coupon) throw ApiError.notFound("That coupon code isn't valid.");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.conflict("That coupon has expired.");
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw ApiError.conflict("That coupon has reached its redemption limit.");
    }

    const subtotal = cart.items.reduce((sum, i) => sum + i.unitPriceCents, 0);
    if (subtotal < (coupon.minSubtotalCents ?? 0)) {
      throw ApiError.conflict(
        `This coupon needs a cart of at least $${((coupon.minSubtotalCents ?? 0) / 100).toFixed(2)}.`
      );
    }

    // Mongoose's InferSchemaType oddly narrows this particular ref path's setter
    // type to the ObjectId *constructor* rather than an instance (it accepts
    // `null` fine, just not a real id) — a TS-inference-only quirk, harmless at
    // runtime; cast through unknown rather than fight the inferred type.
    cart.coupon = coupon._id as unknown as typeof cart.coupon;
    await cart.save();
    return cart;
  },

  async clear(owner: CartOwner): Promise<void> {
    await connectDB();
    const cart = await this.find(owner);
    if (!cart) return;
    cart.items.splice(0, cart.items.length);
    cart.coupon = null;
    await cart.save();
  },

  async computeDiscount(
    cart: CartHydrated
  ): Promise<{ subtotalCents: number; discountCents: number; couponCode: string | null }> {
    const subtotalCents = cart.items.reduce((sum, i) => sum + i.unitPriceCents, 0);
    if (!cart.coupon) return { subtotalCents, discountCents: 0, couponCode: null };

    const coupon = await CouponModel.findById(cart.coupon);
    if (!coupon || !coupon.isActive) return { subtotalCents, discountCents: 0, couponCode: null };

    let eligibleCents = subtotalCents;
    if (coupon.appliesTo !== "ALL" && coupon.appliesToRef) {
      const refId = coupon.appliesToRef.toString();
      eligibleCents = 0;
      for (const item of cart.items) {
        const font = await FontModel.findById(item.font).select("category designer").lean();
        if (!font) continue;
        const matches =
          (coupon.appliesTo === "CATEGORY" && font.category?.toString() === refId) ||
          (coupon.appliesTo === "FONT" && item.font.toString() === refId) ||
          (coupon.appliesTo === "DESIGNER" && font.designer?.toString() === refId);
        if (matches) eligibleCents += item.unitPriceCents;
      }
    }

    const discountCents =
      coupon.type === "PERCENTAGE"
        ? Math.round((eligibleCents * coupon.value) / 100)
        : Math.min(coupon.value, eligibleCents);

    return { subtotalCents, discountCents: Math.min(discountCents, subtotalCents), couponCode: coupon.code };
  },

  async toDTO(cart: CartHydrated): Promise<CartDTO> {
    const { subtotalCents, discountCents, couponCode } = await this.computeDiscount(cart);

    const items: CartItemDTO[] = [];
    for (const item of cart.items) {
      const fontDoc = await FontRepository.findByIdUnfiltered(item.font.toString());
      if (!fontDoc) continue; // font was deleted after being added — skip silently
      const licenseDoc = await FontLicenseModel.findById(item.license).lean();
      if (!licenseDoc) continue;

      let variant: FontVariantDTO | null = null;
      if (item.variant) {
        const variantDoc = await FontVariantModel.findById(item.variant).lean();
        if (variantDoc) {
          let previewFontUrl: string | null = null;
          if (variantDoc.previewFontFile) {
            const file = await FontFileModel.findById(variantDoc.previewFontFile).lean();
            if (file) previewFontUrl = StorageService.getPublicPreviewUrl(file.storageKey);
          }
          variant = {
            id: variantDoc._id.toString(),
            name: variantDoc.name,
            weight: variantDoc.weight,
            style: variantDoc.style as "normal" | "italic",
            isDefault: variantDoc.isDefault,
            previewFontUrl,
          };
        }
      }

      const license: LicenseDTO = {
        id: licenseDoc._id.toString(),
        key: licenseDoc.key,
        name: licenseDoc.name,
        description: licenseDoc.description,
        priceMultiplier: licenseDoc.priceMultiplier,
        allowedUsage: licenseDoc.allowedUsage,
        restrictions: licenseDoc.restrictions,
      };

      items.push({
        id: item._id!.toString(),
        font: await FontRepository.toSummaryDTO(fontDoc),
        license,
        variant,
        unitPriceCents: item.unitPriceCents,
      });
    }

    return {
      id: cart._id.toString(),
      items,
      subtotalCents,
      discountCents,
      totalCents: Math.max(0, subtotalCents - discountCents),
      currency: "USD",
      couponCode,
    };
  },
};
