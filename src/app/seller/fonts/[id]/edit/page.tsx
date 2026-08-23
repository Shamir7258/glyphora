import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FontEditor } from "@/components/seller/font-editor/font-editor";
import { requireDesignerProfileId } from "@/server/lib/session";
import { CategoryRepository } from "@/server/repositories/category.repository";
import { LicenseRepository } from "@/server/repositories/license.repository";
import { connectDB } from "@/server/lib/db";
import { TagModel } from "@/server/models/tag.model";
import { FontModel } from "@/server/models/font.model";

export const metadata: Metadata = { title: "Edit font" };

export default async function EditFontPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const font = await FontModel.findById(id).select("designer name").lean();
  if (!font || font.designer.toString() !== designerProfileId) notFound();

  const [categories, licenses, tags] = await Promise.all([
    CategoryRepository.listActive(),
    LicenseRepository.listActive(),
    listAllTags(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Edit {font.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update any section, then resubmit for review.</p>
      </div>

      <FontEditor fontId={id} categories={categories} tags={tags} licenses={licenses} />
    </div>
  );
}

async function listAllTags() {
  await connectDB();
  const docs = await TagModel.find().sort({ name: 1 }).lean();
  return docs.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug }));
}
