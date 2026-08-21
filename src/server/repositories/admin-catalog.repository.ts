import { connectDB } from "@/server/lib/db";
import { CategoryModel } from "@/server/models/category.model";
import { TagModel } from "@/server/models/tag.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { CouponModel } from "@/server/models/coupon.model";
import slugify from "slugify";
import type { CategoryUpsertInput, TagUpsertInput, LicenseUpsertInput, CouponUpsertInput } from "@/types/schemas/admin.schema";

// Admin write paths for the four "don't hardcode this in the frontend" catalog
// collections (spec requirement, see docs/DEVELOPMENT.md). Deliberately new files
// rather than edits to CategoryRepository/LicenseRepository (owned by the
// storefront agent, read-only today) — both read from the same Mongo collections,
// so anything written here is immediately visible to their existing read paths
// with no shared-file edit required.

export const AdminCategoryRepository = {
  async list() {
    await connectDB();
    return CategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  },
  async create(input: CategoryUpsertInput) {
    await connectDB();
    const slug = input.slug || slugify(input.name, { lower: true, strict: true });
    return CategoryModel.create({ ...input, slug });
  },
  async update(id: string, input: CategoryUpsertInput) {
    await connectDB();
    const before = await CategoryModel.findById(id).lean();
    if (!before) return null;
    const slug = input.slug || slugify(input.name, { lower: true, strict: true });
    const after = await CategoryModel.findByIdAndUpdate(id, { ...input, slug }, { new: true }).lean();
    return { before, after };
  },
};

export const AdminTagRepository = {
  async list() {
    await connectDB();
    return TagModel.find().sort({ name: 1 }).lean();
  },
  async create(input: TagUpsertInput) {
    await connectDB();
    const slug = input.slug || slugify(input.name, { lower: true, strict: true });
    return TagModel.create({ ...input, slug });
  },
  async update(id: string, input: TagUpsertInput) {
    await connectDB();
    const before = await TagModel.findById(id).lean();
    if (!before) return null;
    const slug = input.slug || slugify(input.name, { lower: true, strict: true });
    const after = await TagModel.findByIdAndUpdate(id, { ...input, slug }, { new: true }).lean();
    return { before, after };
  },
};

export const AdminLicenseRepository = {
  async list() {
    await connectDB();
    return FontLicenseModel.find().sort({ sortOrder: 1 }).lean();
  },
  async create(input: LicenseUpsertInput) {
    await connectDB();
    return FontLicenseModel.create(input);
  },
  async update(id: string, input: LicenseUpsertInput) {
    await connectDB();
    const before = await FontLicenseModel.findById(id).lean();
    if (!before) return null;
    const after = await FontLicenseModel.findByIdAndUpdate(id, input, { new: true }).lean();
    return { before, after };
  },
};

export const AdminCouponRepository = {
  async list() {
    await connectDB();
    return CouponModel.find().sort({ createdAt: -1 }).lean();
  },
  async create(input: CouponUpsertInput) {
    await connectDB();
    return CouponModel.create(input);
  },
  async update(id: string, input: Partial<CouponUpsertInput>) {
    await connectDB();
    const before = await CouponModel.findById(id).lean();
    if (!before) return null;
    const after = await CouponModel.findByIdAndUpdate(id, input, { new: true }).lean();
    return { before, after };
  },
};
