"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { fontLicenseSelectionSchema, type FontLicenseSelectionInput } from "@/types/schemas/font.schema";
import type { LicenseDTO } from "@/types/dto";

export function LicenseForm({
  fontId,
  licenses,
  initial,
  onSaved,
  submitLabel = "Continue",
}: {
  fontId: string;
  licenses: LicenseDTO[];
  initial: FontLicenseSelectionInput;
  onSaved: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const form = useForm<FontLicenseSelectionInput>({
    resolver: zodResolver(fontLicenseSelectionSchema),
    defaultValues: initial,
  });
  const selected = useWatch({ control: form.control, name: "licenseIds" }) ?? [];

  async function onSubmit(values: FontLicenseSelectionInput) {
    try {
      await apiFetch(`/api/seller/fonts/${fontId}`, { method: "PATCH", body: JSON.stringify(values) });
      await onSaved();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't save — please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="licenseIds"
          render={() => (
            <FormItem>
              <FormLabel>Which licenses is this font sold under?</FormLabel>
              <div className="space-y-2">
                {licenses.map((license) => {
                  const checked = selected.includes(license.id);
                  return (
                    <Label
                      key={license.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                        checked ? "border-primary bg-accent/60" : "border-border"
                      )}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v ? [...selected, license.id] : selected.filter((id) => id !== license.id);
                          form.setValue("licenseIds", next, { shouldValidate: true });
                        }}
                      />
                      <span>
                        <span className="block font-medium">
                          {license.name}{" "}
                          <span className="font-normal text-muted-foreground">({license.priceMultiplier}×)</span>
                        </span>
                        <span className="block text-sm text-muted-foreground">{license.description}</span>
                      </span>
                    </Label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
