"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Root error boundary — never shows the raw error to the user (spec §38).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-medium">Something went wrong on our end.</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Please try again in a moment. If this keeps happening, let us know.
      </p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
