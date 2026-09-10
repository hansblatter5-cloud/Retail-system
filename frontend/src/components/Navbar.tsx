"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { ShoppingBag, LayoutDashboard } from "lucide-react";
import { LogoMark } from "./LogoMark";

export function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-xl font-bold tracking-tight text-ink">
            Daniel<span className="text-gold">.</span>Store
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-ink/80">
          <Link href="/" className="hover:text-teal transition-colors">
            Shop
          </Link>

          {user ? (
            <>
              {(user.role === "OWNER" || user.role === "MANAGER" || user.role === "STAFF") && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 hover:text-teal transition-colors"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}
              <button onClick={logout} className="hover:text-danger transition-colors">
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:text-teal transition-colors">
              Staff login
            </Link>
          )}

          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-white hover:bg-teal-deep transition-colors"
          >
            <ShoppingBag size={16} />
            Cart
            {totalItems > 0 && (
              <span className="font-ledger absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-ink">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
