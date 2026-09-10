"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  count?: number;
}

// Read-only when `onChange` is omitted (product cards, review list).
// Interactive when provided (review submission form).
export function StarRating({ value, onChange, size = 16, count }: StarRatingProps) {
  const interactive = Boolean(onChange);
  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={size}
            className={star <= Math.round(value) ? "fill-gold text-gold" : "fill-transparent text-ink/25"}
          />
        </button>
      ))}
      {typeof count === "number" && (
        <span className="ml-1.5 text-xs text-ink/50">({count})</span>
      )}
    </div>
  );
}
