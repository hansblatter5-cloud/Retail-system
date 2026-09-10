"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi, getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      // Always show the same confirmation, whether or not the email exists —
      // matches the backend's deliberately generic response.
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        {done ? (
          <>
            <h1 className="font-display mb-2 text-2xl font-bold text-teal">Check your email</h1>
            <p className="text-ink/70">
              If an account exists for <span className="font-medium text-ink">{email}</span>, a password reset
              link has been sent. It expires in 1 hour.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display mb-1 text-2xl font-bold">Reset your password</h1>
            <p className="mb-6 text-sm text-ink/60">
              Enter the email you used to sign up and we&apos;ll send a reset link.
            </p>

            {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-teal py-3.5 font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink/60">
          <Link href="/login" className="font-medium text-teal underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </main>
    </>
  );
}
