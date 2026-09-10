"use client";

import { useEffect, useState } from "react";
import { api, getErrorMessage, ProductQuestion } from "@/lib/api";
import { MessageCircleQuestion } from "lucide-react";

export function QnASection({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<ProductQuestion[]>(`/questions/product/${productId}`)
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [productId]);

  return (
    <section className="border-t border-line pt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">Questions & Answers</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-teal hover:text-teal"
        >
          {showForm ? "Cancel" : "Ask a question"}
        </button>
      </div>

      {showForm && <QuestionForm productId={productId} onSubmitted={() => setShowForm(false)} />}

      <div className="mt-6 flex flex-col gap-5">
        {loading ? (
          <p className="text-sm text-ink/50">Loading questions…</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-ink/50">No questions yet — ask the first one.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="flex gap-3">
              <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-teal" />
              <div>
                <p className="text-sm font-medium text-ink">{q.question}</p>
                <p className="mt-1 text-sm text-ink/70">{q.answer}</p>
                <p className="mt-1 text-xs text-ink/40">
                  {q.authorName} · answered {new Date(q.answeredAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function QuestionForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authorName.trim() || !authorEmail.trim() || !question.trim()) {
      return setError("Name, email, and a question are required.");
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/questions", {
        productId,
        authorName,
        authorEmail,
        question,
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
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask about sizing, materials, delivery..."
        rows={3}
        className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1 self-start rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit question"}
      </button>
    </form>
  );
}
