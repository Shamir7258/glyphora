"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { SiteSettingDTO } from "@/server/repositories/site-setting.repository";

type InputType = "number" | "text" | "currency-code";

export function SiteSettingRow({ setting, type }: { setting: SiteSettingDTO; type: InputType }) {
  const router = useRouter();
  const [value, setValue] = useState(String(setting.value ?? ""));
  const [pending, setPending] = useState(false);

  const dirty = value !== String(setting.value ?? "");

  async function handleSave() {
    setPending(true);
    try {
      const parsedValue: unknown = type === "number" ? Number(value) : type === "currency-code" ? value.toUpperCase() : value;
      if (type === "number" && Number.isNaN(parsedValue as number)) {
        toast.error("Enter a valid number.");
        return;
      }
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ key: setting.key, value: parsedValue }) });
      toast.success(`${setting.key} updated`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-md">
        <p className="font-mono text-xs font-medium text-muted-foreground">{setting.key}</p>
        <p className="text-sm text-foreground/90">{setting.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type={type === "number" ? "number" : "text"}
          maxLength={type === "currency-code" ? 3 : undefined}
          className="w-36"
        />
        <Button size="sm" variant="outline" disabled={!dirty || pending} onClick={handleSave}>
          <Save /> Save
        </Button>
      </div>
    </div>
  );
}
