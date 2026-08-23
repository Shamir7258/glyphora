import type { Metadata } from "next";
import { FontWizard } from "@/components/seller/font-editor/font-wizard";
import { requireDesignerProfileId } from "@/server/lib/session";
import { CategoryRepository } from "@/server/repositories/category.repository";
import { LicenseRepository } from "@/server/repositories/license.repository";
import { connectDB } from "@/server/lib/db";
import { TagModel } from "@/server/models/tag.model";

export const metadata: Metadata = { title: "Upload a font" };

export default async function NewFontPage() {
  await requireDesignerProfileId();

  const [categories, licenses, tags] = await Promise.all([
    CategoryRepository.listActive(),
    LicenseRepository.listActive(),
    listAllTags(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Upload a font</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your font stays a private draft until you submit it — nothing goes live without review.
        </p>
      </div>

      <FontWizard categories={categories} tags={tags} licenses={licenses} />
    </div>
  );
}

async function listAllTags() {
  await connectDB();
  const docs = await TagModel.find().sort({ name: 1 }).lean();
  return docs.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug }));
}
