"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import type { LicenseDTO } from "@/types/dto";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function LicensePicker({
  fontId,
  basePriceCents,
  currency,
  licenses,
}: {
  fontId: string;
  basePriceCents: number;
  currency: string;
  licenses: LicenseDTO[];
}) {
  const [licenseId, setLicenseId] = useState(licenses[0]?.id ?? "");
  const router = useRouter();
  const { addItem } = useCart();

  const selected = licenses.find((l) => l.id === licenseId) ?? licenses[0];
  if (!selected) return null;

  const priceCents = Math.round(basePriceCents * selected.priceMultiplier);

  async function handleAddToCart() {
    await addItem.mutateAsync({ fontId, licenseId });
  }

  async function handleBuyNow() {
    await addItem.mutateAsync({ fontId, licenseId });
    router.push("/cart");
  }

  return (
    <div id="buy" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-medium tracking-tight">Choose a license</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        License rules are set per-project — pick the one that matches how you&apos;ll use this font.
      </p>

      <RadioGroup value={licenseId} onValueChange={setLicenseId} className="mt-5 gap-3">
        {licenses.map((license) => {
          const linePriceCents = Math.round(basePriceCents * license.priceMultiplier);
          return (
            <Label
              key={license.id}
              htmlFor={`license-${license.id}`}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors",
                license.id === licenseId ? "border-primary bg-accent/60" : "border-border hover:bg-accent/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value={license.id} id={`license-${license.id}`} className="mt-0.5" />
                  <div>
                    <p className="font-medium">{license.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{license.description}</p>
                  </div>
                </div>
                <span className="shrink-0 font-medium">{formatPrice(linePriceCents, currency)}</span>
              </div>
              {license.id === licenseId && license.allowedUsage.length > 0 && (
                <ul className="mt-1 ml-6.5 flex flex-col gap-1">
                  {license.allowedUsage.map((usage) => (
                    <li key={usage} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3 shrink-0 text-primary" /> {usage}
                    </li>
                  ))}
                </ul>
              )}
            </Label>
          );
        })}
      </RadioGroup>

      <div className="mt-6 flex flex-col gap-2 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display text-2xl font-medium">{formatPrice(priceCents, currency)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddToCart} disabled={addItem.isPending}>
            <ShoppingBag className="size-4" /> Add to cart
          </Button>
          <Button onClick={handleBuyNow} disabled={addItem.isPending}>
            <Zap className="size-4" /> Buy font
          </Button>
        </div>
      </div>
    </div>
  );
}
