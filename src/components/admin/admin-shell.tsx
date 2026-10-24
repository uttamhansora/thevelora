"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { Menu } from "lucide-react";
import { hasPermission, type AdminRole, type Permission } from "@/lib/auth/permissions";

const LINKS: { href: string; label: string; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard.read" },
  { href: "/admin/products", label: "Products", permission: "products.write" },
  { href: "/admin/categories", label: "Categories", permission: "categories.write" },
  { href: "/admin/collections", label: "Collections", permission: "collections.write" },
  { href: "/admin/orders", label: "Orders", permission: "orders.write" },
  { href: "/admin/customers", label: "Customers", permission: "customers.read" },
  { href: "/admin/coupons", label: "Coupons", permission: "coupons.write" },
  { href: "/admin/homepage", label: "Homepage & Banners", permission: "homepage.write" },
  { href: "/admin/inventory", label: "Inventory", permission: "inventory.write" },
  { href: "/admin/reviews", label: "Reviews", permission: "reviews.moderate" },
  { href: "/admin/settings/shipping", label: "Shipping Settings", permission: "shipping.write" },
  { href: "/admin/settings/payment", label: "Payment Settings", permission: "settings.write" },
  { href: "/admin/settings/store", label: "Store Settings", permission: "settings.write" },
  { href: "/admin/profile", label: "Administrator Profile", permission: "profile.write" },
  { href: "/admin/audit-logs", label: "Audit Logs", permission: "audit.read" },
];

const AdminContext = createContext({ csrfToken: "" });

export function useCsrf() {
  return useContext(AdminContext).csrfToken;
}

export function AdminShell({ session, children }: { session: { name: string; role: AdminRole; csrfToken: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((link) => hasPermission(session.role, link.permission));
  return (
    <div className="min-h-screen bg-background text-text md:grid md:grid-cols-[240px_1fr]">
      <aside className={`${open ? "block" : "hidden"} border-r border-border bg-surface p-4 md:block`}>
        <Link href="/admin" className="font-serif text-2xl tracking-[0.14em] text-primary">THE VELORA</Link>
        <p className="mt-1 text-xs uppercase text-muted">{session.role.replaceAll("_", " ")}</p>
        <nav className="mt-6 grid gap-2 text-sm" aria-label="Admin">
          {links.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-2 py-1 hover:bg-background" onClick={() => setOpen(false)}>{link.label}</Link>)}
        </nav>
        <button className="mt-6 text-sm underline" type="button" onClick={() => fetch("/api/admin/logout", { method: "POST" }).then(() => { window.location.href = "/admin/login"; })}>Log out</button>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <button className="md:hidden" aria-label="Open admin menu" type="button" onClick={() => setOpen((value) => !value)}><Menu /></button>
          <p>{session.name}</p>
          <Link href="/" className="text-sm">View store</Link>
        </header>
        <AdminContext.Provider value={{ csrfToken: session.csrfToken }}>
          <div className="p-4 md:p-8">{children}</div>
        </AdminContext.Provider>
      </div>
    </div>
  );
}

export async function adminFetch(csrfToken: string, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", csrfToken);
  if (!(init.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed") as Error & { fieldErrors?: Record<string, string[]> };
    error.fieldErrors = data.fieldErrors;
    throw error;
  }
  return data;
}
