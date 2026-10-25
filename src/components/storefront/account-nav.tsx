import Link from "next/link";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
];

export function AccountNav({ current }: { current: "overview" | "profile" | "orders" }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Account">
      {links.map((link) => {
        const active =
          (current === "overview" && link.href === "/account") ||
          (current === "profile" && link.href === "/account/profile") ||
          (current === "orders" && link.href === "/account/orders");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-primary text-white" : "border border-border bg-surface hover:border-primary"}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
