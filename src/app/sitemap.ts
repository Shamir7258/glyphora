import type { MetadataRoute } from "next";
import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { CategoryModel } from "@/server/models/category.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const [fonts, categories, designers] = await Promise.all([
    FontModel.find({ status: "PUBLISHED" }).select("slug updatedAt").limit(5000).lean(),
    CategoryModel.find({ isActive: true }).select("slug").lean(),
    DesignerProfileModel.find({ status: "ACTIVE" }).select("username updatedAt").lean(),
  ]);

  return [
    { url: APP_URL, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/fonts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/originals`, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/designers`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${APP_URL}/bundles`, changeFrequency: "weekly", priority: 0.6 },
    ...categories.map((c) => ({
      url: `${APP_URL}/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...designers.map((d) => ({
      url: `${APP_URL}/designers/${d.username}`,
      lastModified: d.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...fonts.map((f) => ({
      url: `${APP_URL}/fonts/${f.slug}`,
      lastModified: f.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
