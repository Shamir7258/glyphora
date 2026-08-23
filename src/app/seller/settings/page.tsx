import type { Metadata } from "next";
import { SettingsForm } from "@/components/seller/settings-form";
import { requireDesignerProfileId } from "@/server/lib/session";
import { SellerProfileService } from "@/server/services/seller-profile.service";

export const metadata: Metadata = { title: "Settings" };

export default async function SellerSettingsPage() {
  const { designerProfileId } = await requireDesignerProfileId();
  const { profile } = await SellerProfileService.getOwnProfile(designerProfileId);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your public profile at <span className="font-mono">/designers/{profile.username}</span> and payout details.
        </p>
      </div>

      <SettingsForm
        initial={{
          displayName: profile.displayName,
          bio: profile.bio ?? "",
          website: profile.website ?? "",
          avatarUrl: profile.avatarUrl ?? "",
          coverImageUrl: profile.coverImageUrl ?? "",
          socialLinks: {
            twitter: profile.socialLinks?.twitter ?? "",
            instagram: profile.socialLinks?.instagram ?? "",
            behance: profile.socialLinks?.behance ?? "",
            dribbble: profile.socialLinks?.dribbble ?? "",
          },
          payoutMethod: profile.payoutMethod ?? "",
          payoutDetails: typeof profile.payoutDetails === "string" ? profile.payoutDetails : "",
        }}
      />
    </div>
  );
}
