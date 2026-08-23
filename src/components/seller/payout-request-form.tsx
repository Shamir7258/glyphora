"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { payoutRequestSchema, type PayoutRequestInput } from "@/types/schemas/seller.schema";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function PayoutRequestForm({
  availableCents,
  minimumAmountCents,
}: {
  availableCents: number;
  minimumAmountCents: number;
}) {
  const router = useRouter();
  const form = useForm<PayoutRequestInput>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: { amountCents: 0 },
  });

  const canRequest = availableCents >= minimumAmountCents;

  async function onSubmit(values: { amountCents: number }) {
    try {
      // Dollar input from the field is converted to cents before this runs — see below.
      await apiFetch("/api/seller/payouts", { method: "POST", body: JSON.stringify(values) });
      toast.success("Payout requested — an admin will process it soon.");
      form.reset({ amountCents: 0 });
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't submit that request — please try again.");
    }
  }

  if (!canRequest) {
    return (
      <p className="text-sm text-muted-foreground">
        You need at least {formatCents(minimumAmountCents)} available to request a payout. You currently have{" "}
        {formatCents(availableCents)}.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit({ amountCents: values.amountCents }))}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <FormField
          control={form.control}
          name="amountCents"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={minimumAmountCents / 100}
                  max={availableCents / 100}
                  step="0.01"
                  placeholder={(availableCents / 100).toFixed(2)}
                  value={field.value ? field.value / 100 : ""}
                  onChange={(e) => field.onChange(Math.round(Number(e.target.value || 0) * 100))}
                />
              </FormControl>
              <FormDescription>
                Available: {formatCents(availableCents)} · Minimum: {formatCents(minimumAmountCents)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Requesting…" : "Request payout"}
        </Button>
      </form>
    </Form>
  );
}
