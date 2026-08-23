"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorite } from "@/hooks/use-favorite";
import { cn } from "@/lib/utils";

export function FavoriteButton({ fontId, favoriteId }: { fontId: string; favoriteId: string | null }) {
  const [isFavorited, setIsFavorited] = useState(!!favoriteId);
  const favorite = useFavorite(fontId, favoriteId);

  return (
    <Button
      variant="outline"
      aria-pressed={isFavorited}
      onClick={() => {
        setIsFavorited((v) => !v);
        favorite.toggle(favoriteId);
      }}
    >
      <Heart className={cn("size-4 transition-transform", isFavorited && "scale-110 fill-primary text-primary")} />
      {isFavorited ? "Favorited" : "Favorite"}
    </Button>
  );
}
