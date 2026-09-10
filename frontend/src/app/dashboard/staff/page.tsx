"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Role, AccountStatus, getErrorMessage } from "@/lib/api";
import { Check, X } from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
}

export default function StaffPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.role === "OWNER";

  function load() {
    if (!token) return;
    setLoading(true);
    api
      .get<StaffUser[]>("/users", token)
      .then(setUsers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function decide(id: string, status: "APPROVED" | "REJECTED", role?: Role) {
    if (!token) return;
    try {
      await api.patch(`/users/${id}/decision`, { status, role }, token);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function changeRole(id: string, role: Role) {
    if (!token) return;
    try {
      await api.patch(`/users/${id}/role`, { role }, token);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const pending = users.filter((u) => u.status === "PENDING");
  const approved = users.filter((u) => u.status === "APPROVED");

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold">Staff</h1>
      <p className="mb-6 text-sm text-ink/50">Approve signups and manage roles.</p>

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {pending.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 font-display font-semibold">Pending approval ({pending.length})</p>
          <div className="flex flex-col gap-3">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-2xl border border-gold/30 bg-gold/5 p-4">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-ink/50">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(u.id, "APPROVED", "STAFF")}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    <Check size={14} /> Approve as Staff
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => decide(u.id, "APPROVED", "MANAGER")}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-line/40"
                    >
                      Approve as Manager
                    </button>
                  )}
                  <button
                    onClick={() => decide(u.id, "REJECTED")}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 font-display font-semibold">Team ({approved.length})</p>
      {loading ? (
        <p className="text-sm text-ink/50">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-elev-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {approved.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-ink/50">{u.email}</td>
                  <td className="px-4 py-3">
                    {isOwner && u.id !== user?.id ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        className="rounded-full border border-line px-2.5 py-1 text-xs"
                      >
                        <option value="STAFF">Staff</option>
                        <option value="MANAGER">Manager</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-line/50 px-2.5 py-1 text-xs capitalize">
                        {u.role.toLowerCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
