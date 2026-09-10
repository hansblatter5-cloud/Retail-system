"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  Store,
  ArrowLeftRight,
  Settings,
} from "lucide-react";
import { LogoMark } from "./LogoMark";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package, roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/dashboard/customers", label: "Customers", icon: Users, roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/dashboard/pos", label: "Point of Sale", icon: Store, roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/dashboard/staff", label: "Staff", icon: UserCog, roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["OWNER", "MANAGER", "STAFF"] },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;
  const visibleLinks = links.filter((l) => l.roles.includes(user.role));

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-white">
      <div className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <LogoMark size={22} />
          <p className="font-display text-lg font-bold">Business Panel</p>
        </div>
        <p className="text-xs text-ink/50">
          {user.name} · <span className="capitalize">{user.role.toLowerCase()}</span>
        </p>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-teal text-white" : "text-ink/70 hover:bg-line/50"
              }`}
            >
              <Icon size={17} />
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/50 hover:bg-line/50"
        >
          <ArrowLeftRight size={17} />
          Back to storefront
        </Link>
      </nav>
    </aside>
  );
}
