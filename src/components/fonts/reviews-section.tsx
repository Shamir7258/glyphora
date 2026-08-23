"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { ReviewDTO } from "@/types/dto";

function StarRow({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
      ))}
    </div>
  );
}

export function ReviewsSection({
  fontId,
  reviews,
  summary,
  canReview,
}: {
  fontId: string;
  reviews: ReviewDTO[];
  summary: { average: number; count: number };
  canReview: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: () => apiFetch<ReviewDTO>("/api/reviews", { method: "POST", body: JSON.stringify({ fontId, rating, comment }) }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      setSubmitted(true);
      router.refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't submit your review."),
  });

  return (
    <div className="flex flex-col gap-8">
      {summary.count > 0 && (
        <div className="flex items-center gap-3">
          <StarRow rating={Math.round(summary.average)} size="size-5" />
          <p className="font-medium">{summary.average.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">
            ({summary.count} {summary.count === 1 ? "review" : "reviews"})
          </p>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Be the first to review this font after purchasing it." />
      ) : (
        <div className="flex flex-col gap-5">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-border/70 pb-5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{r.user.name}</p>
                <StarRow rating={r.rating} />
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {canReview && !submitted && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-medium">Leave a review</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`Rate ${n} stars`} onClick={() => setRating(n)}>
                <Star className={cn("size-6 transition-colors", n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you use this font for? (optional)"
            rows={3}
            className="mt-3 resize-none"
          />
          <Button className="mt-3" onClick={() => submit.mutate()} disabled={submit.isPending}>
            Submit review
          </Button>
        </div>
      )}
    </div>
  );
}
