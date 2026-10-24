"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useStore } from "@/components/storefront/providers";
import type { StoreSettingsData } from "@/lib/validation/settings";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/collections/sarees", label: "Sarees" },
  { href: "/collections/silk-sarees", label: "Silk Sarees" },
  { href: "/collections/everyday-wear", label: "Everyday Wear" },
  { href: "/collections/festive-wear", label: "Festive Wear" },
  { href: "/collections/new-arrivals", label: "New Arrivals" },
  { href: "/about", label: "About Us" },
];

type SearchResult = {
  products: { slug: string; name: string; sku: string }[];
  collections: { slug: string; name: string }[];
};

export function AnnouncementBar({ settings }: { settings: StoreSettingsData }) {
  if (!settings.announcement.enabled || !settings.announcement.text) return null;
  const content = <span>{settings.announcement.text}</span>;
  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-white">
      {settings.announcement.href ? <Link href={settings.announcement.href}>{content}</Link> : content}
    </div>
  );
}

export function SiteHeader() {
  const { cart, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button className="btn-secondary btn px-3 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <Link href="/" className="font-serif text-2xl tracking-[0.18em] text-primary">THE VELORA</Link>
        <nav className="ml-6 hidden items-center gap-4 text-sm lg:flex" aria-label="Primary">
          {NAV.map((item) => <Link key={item.href} href={item.href} className="hover:text-primary">{item.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button className="rounded-full p-2" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
          <Link href="/wishlist" className="rounded-full p-2" aria-label={`Wishlist, ${wishlist.length} items`}><Heart size={18} /></Link>
          <Link href="/account" className="rounded-full p-2" aria-label="Account"><UserRound size={18} /></Link>
          <button className="relative rounded-full p-2" aria-label={`Cart, ${count} items`} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} />
            {count > 0 ? <span className="absolute right-0 top-0 rounded-full bg-primary px-1.5 text-[10px] text-white">{count}</span> : null}
          </button>
        </div>
      </div>
      {open ? <MobileNavigation onClose={() => setOpen(false)} /> : null}
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
      {cartOpen ? <CartDrawer onClose={() => setCartOpen(false)} /> : null}
    </header>
  );
}

function MobileNavigation({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-text/40 lg:hidden" onClick={onClose}>
      <nav className="h-full w-80 max-w-[85%] bg-background p-6" aria-label="Mobile" onClick={(event) => event.stopPropagation()}>
        <button className="mb-6" aria-label="Close menu" onClick={onClose}><X /></button>
        <div className="grid gap-4 text-lg">
          {NAV.map((item) => <Link key={item.href} href={item.href} onClick={onClose}>{item.label}</Link>)}
        </div>
      </nav>
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) return;
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Search is unavailable.");
      else {
        setMessage("");
        setResult(data);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-text/40" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto mt-16 w-[min(640px,92%)] rounded-3xl bg-surface p-5">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="search">Search products</label>
          <input id="search" autoFocus className="field" placeholder="Search by product name or SKU" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button aria-label="Close search" onClick={onClose}><X /></button>
        </div>
        <div className="mt-4 grid gap-2">
          {message ? <p>{message}</p> : null}
          {result?.collections.map((item) => <Link key={item.slug} href={`/collections/${item.slug}`} onClick={onClose} className="text-primary">{item.name}</Link>)}
          {result?.products.map((item) => <Link key={item.slug} href={`/products/${item.slug}`} onClick={onClose}>{item.name} <span className="text-muted">{item.sku}</span></Link>)}
          {result && result.products.length === 0 ? <p className="text-muted">No matching products.</p> : null}
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart } = useStore();
  return (
    <div className="fixed inset-0 z-50 bg-text/40" role="dialog" aria-modal="true" aria-label="Cart">
      <aside className="ml-auto h-full w-[min(420px,100%)] bg-background p-6">
        <div className="flex items-center justify-between"><h2 className="font-serif text-3xl">Your bag</h2><button aria-label="Close cart" onClick={onClose}><X /></button></div>
        <p className="mt-4 text-muted">{cart.length === 0 ? "Your bag is empty." : `${cart.length} item${cart.length === 1 ? "" : "s"} saved on this device.`}</p>
        <div className="mt-6 flex gap-3">
          <Link className="btn" href="/cart" onClick={onClose}>View cart</Link>
          <Link className="btn btn-secondary" href="/collections/sarees" onClick={onClose}>Continue shopping</Link>
        </div>
      </aside>
    </div>
  );
}

export function SiteFooter({ settings }: { settings: StoreSettingsData }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-serif text-3xl text-primary">THE VELORA</p>
          <p className="mt-2 text-muted">Elegance Woven for You.</p>
        </div>
        <div>
          <h2 className="font-serif text-2xl">Customer care</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {settings.footerLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </div>
        </div>
        <div>
          <h2 className="font-serif text-2xl">Contact</h2>
          <p className="mt-3 text-sm text-muted">{settings.contact.email || "Email will appear here once it is added in store settings."}</p>
          <p className="text-sm text-muted">{settings.contact.phone}</p>
          <p className="text-sm text-muted">{settings.contact.address}</p>
        </div>
        <div>
          <h2 className="font-serif text-2xl">Social</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {settings.social.instagram ? <a href={settings.social.instagram}>Instagram</a> : null}
            {settings.social.facebook ? <a href={settings.social.facebook}>Facebook</a> : null}
            {settings.social.pinterest ? <a href={settings.social.pinterest}>Pinterest</a> : null}
            {!settings.social.instagram && !settings.social.facebook && !settings.social.pinterest ? <p className="text-muted">Social links can be added by an administrator.</p> : null}
          </div>
        </div>
      </div>
      <NewsletterForm />
    </footer>
  );
}

function NewsletterForm() {
  const [message, setMessage] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), consent: form.get("consent") === "on" }),
    });
    const data = await response.json();
    setMessage(response.ok ? "You are subscribed." : data.error || "Please check the form.");
  }
  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-6xl gap-3 border-t border-border px-4 py-8 md:grid-cols-[1fr_auto_auto] md:items-center">
      <div>
        <label htmlFor="newsletter-email" className="font-serif text-2xl">Notes from the atelier</label>
        <p className="text-sm text-muted">Occasional collection news. No account is required.</p>
      </div>
      <input id="newsletter-email" name="email" type="email" required className="field" placeholder="Email address" />
      <button className="btn" type="submit">Subscribe</button>
      <label className="flex items-center gap-2 text-sm md:col-span-3"><input name="consent" type="checkbox" required /> I agree to receive emails from THE VELORA.</label>
      {message ? <p className="text-sm md:col-span-3">{message}</p> : null}
    </form>
  );
}

export function HeroBanner({ settings }: { settings: StoreSettingsData }) {
  const image = settings.hero.desktopImage.url;
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      {image ? <img src={image} alt={settings.hero.desktopImage.alt || ""} className="absolute inset-0 hidden h-full w-full object-cover opacity-80 md:block" /> : null}
      {settings.hero.mobileImage.url ? <img src={settings.hero.mobileImage.url} alt={settings.hero.mobileImage.alt || ""} className="absolute inset-0 h-full w-full object-cover opacity-80 md:hidden" /> : null}
      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-4 py-16">
        <p className="text-sm uppercase tracking-[0.28em] text-gold">THE VELORA</p>
        <h1 className="mt-3 max-w-xl font-serif text-5xl leading-tight md:text-7xl">{settings.hero.title}</h1>
        <p className="mt-4 max-w-lg text-lg">{settings.hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-light" href={settings.hero.primaryCtaHref}>{settings.hero.primaryCtaLabel}</Link>
          <Link className="btn btn-ghost" href={settings.hero.secondaryCtaHref}>{settings.hero.secondaryCtaLabel}</Link>
        </div>
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: { slug: string; name: string; pricePaise: number; compareAtPricePaise: number | null; images: { url: string; alt: string }[]; inStock: boolean } }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="card overflow-hidden">
      <div className="flex aspect-[3/4] items-center justify-center bg-rose/30">
        {image ? <img src={image.url} alt={image.alt || product.name} className="h-full w-full object-cover" /> : <span className="font-serif text-5xl text-primary">V</span>}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-2xl">{product.name}</h3>
        <p className="mt-1 text-sm">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(product.pricePaise / 100)}</p>
        {!product.inStock ? <p className="text-sm text-muted">Out of stock</p> : null}
      </div>
    </Link>
  );
}
