"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi, getErrorMessage } from "@/lib/api";

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, token);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display mb-1 text-2xl font-bold">Account settings</h1>
      <p className="mb-6 text-sm text-ink/50">
        Signed in as {user?.name} ({user?.email})
      </p>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-elev-sm">
        <p className="mb-4 font-display font-semibold">Change password</p>

        {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        {success && (
          <p className="mb-4 rounded-xl bg-success/10 p-3 text-sm text-success">Password updated successfully.</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-teal py-3 text-sm font-medium text-white hover:bg-teal-deep disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
