import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesignerCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card px-8 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Sell your fonts to a global audience
          </h2>
          <p className="mt-2 text-muted-foreground">
            Set your own price, keep the majority of every sale, and get paid for
            work you already love making.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 rounded-full">
          <Link href="/designer-register">
            Become a designer <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
