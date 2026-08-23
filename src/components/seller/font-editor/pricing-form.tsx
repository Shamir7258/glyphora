"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { fontPricingSchema, type FontPricingInput } from "@/types/schemas/font.schema";

export function PricingForm({
  fontId,
  initial,
  onSaved,
  submitLabel = "Continue",
}: {
  fontId: string;
  initial: FontPricingInput;
  onSaved: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const form = useForm<FontPricingInput>({ resolver: zodResolver(fontPricingSchema), defaultValues: initial });

  async function onSubmit(values: FontPricingInput) {
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
          name="basePriceCents"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Base price (USD)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={field.value ? field.value / 100 : ""}
                  onChange={(e) => field.onChange(Math.round(Number(e.target.value || 0) * 100))}
                />
              </FormControl>
              <FormDescription>
                This is the Personal-license price. Extended license prices are calculated automatically by license
                multiplier at checkout.
              </FormDescription>
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
