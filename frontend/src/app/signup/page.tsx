"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(name, email, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <Navbar />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
          <h1 className="font-display mb-2 text-2xl font-bold text-teal">Request submitted</h1>
          <p className="text-ink/70">
            Your account has been created and is awaiting approval from an admin. You&apos;ll be able to log in
            once approved.
          </p>
          <Link href="/login" className="mt-6 font-medium text-teal underline underline-offset-4">
            Back to login
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-display mb-1 text-2xl font-bold">Request staff access</h1>
        <p className="mb-6 text-sm text-ink/60">
          Submit your details below. An admin must approve your account before you can log in.
        </p>

        {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-teal py-3.5 font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Request access"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Already approved?{" "}
          <Link href="/login" className="font-medium text-teal underline underline-offset-4">
            Log in
          </Link>
        </p>
      </main>
    </>
  );
}
