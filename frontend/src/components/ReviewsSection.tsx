"use client";

import { useEffect, useState } from "react";
import { api, getErrorMessage, Review, ReviewsResponse, uploadReviewAttachment } from "@/lib/api";
import { StarRating } from "./StarRating";
import { BadgeCheck, Image as ImageIcon, Video, X, Loader2 } from "lucide-react";

interface Attachment {
  url: string;
  type: "image" | "video";
}

export function ReviewsSection({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<ReviewsResponse>(`/reviews/product/${productId}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [productId]);

  return (
    <section className="border-t border-line pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Reviews</h2>
          {data && data.total > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={data.avgRating ?? 0} count={data.total} />
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-teal hover:text-teal"
        >
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>

      {showForm && (
        <ReviewForm
          productId={productId}
          onSubmitted={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-ink/50">Loading reviews…</p>
        ) : !data || data.reviews.length === 0 ? (
          <p className="text-sm text-ink/50">No reviews yet — be the first to write one.</p>
        ) : (
          data.reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border-b border-line pb-6 last:border-0">
      <div className="flex items-center gap-2">
        <StarRating value={review.rating} size={14} />
        {review.verifiedPurchase && (
          <span className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
            <BadgeCheck size={12} /> Verified buyer
          </span>
        )}
      </div>
      {review.title && <p className="mt-2 font-medium text-ink">{review.title}</p>}
      <p className="mt-1 text-sm text-ink/70">{review.comment}</p>
      <p className="mt-1 text-xs text-ink/40">
        {review.authorName} · {new Date(review.createdAt).toLocaleDateString()}
      </p>

      {(review.photoUrls.length > 0 || review.videoUrls.length > 0) && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Review photo" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          ))}
          {review.videoUrls.map((url) => (
            <video key={url} src={url} controls className="h-20 w-28 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (attachments.length >= 6) {
      setError("You can attach up to 6 photos/videos.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadReviewAttachment(file);
      setAttachments((prev) => [...prev, res]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating === 0) return setError("Please select a star rating.");
    if (!authorName.trim() || !authorEmail.trim() || !comment.trim()) {
      return setError("Name, email, and a comment are required.");
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/reviews", {
        productId,
        authorName,
        authorEmail,
        rating,
        title: title || undefined,
        comment,
        photoUrls: attachments.filter((a) => a.type === "image").map((a) => a.url),
        videoUrls: attachments.filter((a) => a.type === "video").map((a) => a.url),
      });
      setSuccess(res.message);
      setTimeout(onSubmitted, 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <p className="mt-4 rounded-xl bg-teal/10 p-4 text-sm text-teal">{success}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-5">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink/50">Your rating</p>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name"
          className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
        />
        <input
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          type="email"
          placeholder="Your email"
          className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
        />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
      />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think of this product?"
        rows={4}
        className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
      />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {attachments.map((a) => (
            <div key={a.url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="Attachment" className="h-full w-full object-cover" />
              ) : (
                <video src={a.url} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((x) => x.url !== a.url))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-ink/40 hover:border-teal hover:text-teal">
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <div className="flex gap-0.5">
                  <ImageIcon size={14} />
                  <Video size={14} />
                </div>
                <span className="text-[10px]">Add</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="mt-1 self-start rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
