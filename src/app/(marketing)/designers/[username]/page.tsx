import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, Instagram, Twitter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FontCard } from "@/components/fonts/font-card";
import { DesignerRepository } from "@/server/repositories/designer.repository";
import { FontRepository } from "@/server/repositories/font.repository";
import { connectDB } from "@/server/lib/db";
import { CollectionModel } from "@/server/models/collection.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";

export const revalidate = 60;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const designer = await DesignerRepository.findByUsername(username);
  if (!designer) return { title: "Designer not found" };
  return {
    title: designer.displayName,
    description: designer.bio || `${designer.displayName} on Glyphora.`,
  };
}

export default async function DesignerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const designer = await DesignerRepository.findByUsername(username);
  if (!designer) notFound();

  const [{ items: fonts }, publicCollections] = await Promise.all([
    FontRepository.listPublished({ designerId: designer.id, sort: "newest", limit: 48 }),
    listDesignerPublicCollections(username),
  ]);
  const fontDTOs = await Promise.all(fonts.map((f) => FontRepository.toSummaryDTO(f)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-6 border-b border-border/80 pb-8 sm:flex-row sm:items-center">
        <Avatar className="size-20 sm:size-24">
          <AvatarImage src={designer.avatarUrl} alt="" />
          <AvatarFallback className="text-2xl">{initials(designer.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl tracking-tight">{designer.displayName}</h1>
            {designer.isPlatform && <Badge>Glyphora Originals</Badge>}
          </div>
          <p className="mt-0.5 text-muted-foreground">@{designer.username}</p>
          {designer.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{designer.bio}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{designer.fontCount}</strong> published{" "}
              {designer.fontCount === 1 ? "font" : "fonts"}
            </span>
            {designer.stats.totalSalesCount > 0 && (
              <span className="text-muted-foreground">
                <strong className="text-foreground">{designer.stats.totalSalesCount}</strong> sales
              </span>
            )}
            {designer.website && (
              <Link
                href={designer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Globe className="size-4" /> Website
              </Link>
            )}
            {designer.socialLinks.twitter && (
              <Link
                href={designer.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Twitter className="size-4" /> Twitter
              </Link>
            )}
            {designer.socialLinks.instagram && (
              <Link
                href={designer.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Instagram className="size-4" /> Instagram
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="py-10">
        <h2 className="mb-5 font-display text-2xl tracking-tight">Fonts</h2>
        {fontDTOs.length === 0 ? (
          <EmptyState title="No published fonts yet" description="Check back soon — this designer is just getting started." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fontDTOs.map((font) => (
              <FontCard key={font.id} font={font} />
            ))}
          </div>
        )}
      </div>

      {publicCollections.length > 0 && (
        <div className="border-t border-border/80 py-10">
          <h2 className="mb-5 font-display text-2xl tracking-tight">Collections</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {publicCollections.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-5">
                <p className="font-medium">{c.name}</p>
                {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.fontCount} {c.fontCount === 1 ? "font" : "fonts"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * This designer's own public collections (curated folders they've marked
 * public). Collection.user references User, not DesignerProfile, so this
 * queries the DesignerProfile's underlying user id directly rather than
 * extending the shared DesignerProfileDTO (see docs/agent-reports). In
 * practice this is almost always empty in V1 — per docs/DEVELOPMENT.md,
 * public Collections ("Bundles") are curated admin-owned merchandising, not
 * something the seller dashboard currently exposes a way to create.
 */
async function listDesignerPublicCollections(username: string) {
  await connectDB();
  const profile = await DesignerProfileModel.findOne({ username }).select("user").lean();
  if (!profile) return [];

  const docs = await CollectionModel.find({ user: profile.user, isPublic: true })
    .sort({ updatedAt: -1 })
    .limit(6)
    .lean();

  return docs.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    fontCount: c.fonts.length,
  }));
}
