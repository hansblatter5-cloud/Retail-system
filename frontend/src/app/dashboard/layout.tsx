"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-ink/50">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-1">
      <DashboardSidebar />
      <div className="flex-1 overflow-x-hidden bg-paper px-8 py-8">{children}</div>
    </div>
  );
}
