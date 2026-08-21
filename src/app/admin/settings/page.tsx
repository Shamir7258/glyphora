import { SiteSettingRepository, KNOWN_SETTINGS } from "@/server/repositories/site-setting.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SiteSettingRow } from "@/components/admin/site-setting-row";

export const metadata = { title: "Settings — Glyphora Admin" };

export default async function AdminSettingsPage() {
  const settings = await SiteSettingRepository.listAll();
  const typeByKey = new Map(KNOWN_SETTINGS.map((k) => [k.key, k.type]));

  return (
    <div className="mx-auto max-w-2xl">
      <AdminPageHeader title="Settings" description="Site-wide key/value configuration, editable without a deploy." />

      <div className="rounded-xl border border-border bg-card px-5">
        {settings.map((s) => (
          <SiteSettingRow key={s.key} setting={s} type={typeByKey.get(s.key) ?? "text"} />
        ))}
      </div>
    </div>
  );
}
