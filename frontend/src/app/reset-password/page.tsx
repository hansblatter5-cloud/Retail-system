"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi, getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-danger">This reset link is missing its token. Please use the link from your email.</p>
        <Link href="/forgot-password" className="mt-4 font-medium text-teal underline underline-offset-4">
          Request a new link
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="font-display mb-2 text-2xl font-bold text-teal">Password updated</h1>
        <p className="text-ink/70">Redirecting you to login...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display mb-1 text-2xl font-bold">Set a new password</h1>
      <p className="mb-6 text-sm text-ink/60">At least 8 characters, with a letter and a number.</p>

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          required
          type="password"
          minLength={8}
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-teal py-3.5 font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
        >
          {submitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="flex-1 px-6 py-16 text-center text-ink/50">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
