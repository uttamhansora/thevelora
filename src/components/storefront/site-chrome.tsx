"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useStore } from "@/components/storefront/providers";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
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

function BodyPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

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
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-3 sm:gap-3 sm:px-4">
        <button type="button" className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold text-primary lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={19} /></button>
        <Link href="/" className="min-w-0 flex-1 truncate font-serif text-[1.05rem] tracking-[0.1em] text-primary sm:flex-none sm:text-2xl sm:tracking-[0.18em]">THE VELORA</Link>
        <nav className="ml-6 hidden items-center gap-4 text-sm lg:flex" aria-label="Primary">
          {NAV.map((item) => <Link key={item.href} href={item.href} className="hover:text-primary">{item.label}</Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-0.5 sm:ml-auto sm:gap-1">
          <button className="grid h-10 w-10 place-items-center rounded-full" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
          <Link href="/wishlist" className="grid h-10 w-10 place-items-center rounded-full max-[360px]:hidden" aria-label={`Wishlist, ${wishlist.length} items`}><Heart size={18} /></Link>
          <Link href="/account" className="grid h-10 w-10 place-items-center rounded-full" aria-label="Account"><UserRound size={18} /></Link>
          <button className="relative grid h-10 w-10 place-items-center rounded-full" aria-label={`Cart, ${count} items`} onClick={() => setCartOpen(true)}>
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[100] flex bg-text/55 lg:hidden" onClick={onClose}>
        <nav
          className="flex h-full w-[min(20rem,88vw)] max-w-full flex-col overflow-y-auto bg-background p-5 shadow-2xl"
          aria-label="Mobile"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <p className="font-serif text-2xl text-primary">Menu</p>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Close menu" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="mt-4 grid gap-1">
            {NAV.map((item) => <Link key={item.href} href={item.href} onClick={onClose} className="rounded-xl px-4 py-3 text-lg font-medium transition hover:bg-rose/30">{item.label}</Link>)}
          </div>
          <Link href="/collections/sarees" onClick={onClose} className="btn mt-auto w-full rounded-xl py-3">Shop sarees</Link>
        </nav>
      </div>
    </BodyPortal>
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
    <BodyPortal>
      <div className="fixed inset-0 z-[100] bg-text/50 p-4" role="dialog" aria-modal="true" aria-label="Search" onClick={onClose}>
        <div className="mx-auto mt-12 w-full max-w-xl rounded-3xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="search">Search products</label>
            <input id="search" autoFocus className="field" placeholder="Search by product name or SKU" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="button" aria-label="Close search" onClick={onClose}><X /></button>
          </div>
          <div className="mt-4 grid gap-2">
            {message ? <p>{message}</p> : null}
            {result?.collections.map((item) => <Link key={item.slug} href={`/collections/${item.slug}`} onClick={onClose} className="text-primary">{item.name}</Link>)}
            {result?.products.map((item) => <Link key={item.slug} href={`/products/${item.slug}`} onClick={onClose}>{item.name} <span className="text-muted">{item.sku}</span></Link>)}
            {result && result.products.length === 0 ? <p className="text-muted">No matching products.</p> : null}
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart } = useStore();
  const quantity = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[100] flex justify-end bg-text/55" role="dialog" aria-modal="true" aria-label="Cart" onClick={onClose}>
        <aside
          className="flex h-full w-full max-w-md flex-col bg-background p-5 shadow-[-12px_0_40px_rgba(48,37,31,0.12)] sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text">Your bag</h2>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Close cart" onClick={onClose}><X size={20} /></button>
          </div>
          <p className="mt-5 text-muted">{cart.length === 0 ? "Your bag is empty." : `${quantity} item${quantity === 1 ? "" : "s"} ready for checkout.`}</p>
          <div className="mt-auto grid gap-3 pt-8">
            <Link className="btn w-full" href="/cart" onClick={onClose}>View cart</Link>
            <Link className="btn btn-secondary w-full" href="/collections/sarees" onClick={onClose}>Continue shopping</Link>
          </div>
        </aside>
      </div>
    </BodyPortal>
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
      <button className="btn w-full md:w-auto" type="submit">Subscribe</button>
      <label className="flex items-center gap-2 text-sm md:col-span-3"><input name="consent" type="checkbox" required /> I agree to receive emails from THE VELORA.</label>
      {message ? <p className="text-sm md:col-span-3">{message}</p> : null}
    </form>
  );
}

export function HeroBanner({ settings }: { settings: StoreSettingsData }) {
  const desktopImage = settings.hero.desktopImage.url || "/images/fallbacks/velora-hero.jpg";
  const mobileImage = settings.hero.mobileImage.url || settings.hero.desktopImage.url || "/images/fallbacks/velora-hero.jpg";
  return (
    <section className="relative isolate overflow-hidden bg-primary text-white">
      <ImageWithFallback src={desktopImage} fallbackSrc="/images/fallbacks/velora-hero.jpg" alt={settings.hero.desktopImage.alt || ""} className="absolute inset-0 hidden h-full w-full object-cover opacity-75 md:block" />
      <ImageWithFallback src={mobileImage} fallbackSrc="/images/fallbacks/velora-hero.jpg" alt={settings.hero.mobileImage.alt || settings.hero.desktopImage.alt || ""} className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-75 md:hidden" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
      <div className="relative z-10 mx-auto flex min-h-[min(92dvh,720px)] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:min-h-[620px] sm:px-6 sm:pb-16 sm:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold sm:text-sm">THE VELORA</p>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl md:text-7xl">{settings.hero.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/90 sm:text-lg">{settings.hero.subtitle}</p>
        <div className="mt-8 grid w-full max-w-md gap-3 sm:max-w-none sm:flex sm:flex-wrap">
          <Link
            className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary shadow-xl transition hover:bg-rose sm:min-w-52 sm:w-auto"
            href={settings.hero.primaryCtaHref}
          >
            {settings.hero.primaryCtaLabel}
          </Link>
          <Link
            className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-gold/90 bg-black/35 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition hover:bg-black/50 sm:min-w-52 sm:w-auto"
            href={settings.hero.secondaryCtaHref}
          >
            {settings.hero.secondaryCtaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: { slug: string; name: string; pricePaise: number; compareAtPricePaise: number | null; images: { url: string; alt: string }[]; inStock: boolean } }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="card group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-rose/30">
        {image ? <ImageWithFallback src={image.url} alt={image.alt || product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <ImageWithFallback src="/images/fallbacks/product.jpg" alt={product.name} className="h-full w-full object-cover" />}
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="font-serif text-xl leading-tight sm:text-2xl">{product.name}</h3>
        <p className="mt-1 text-sm">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(product.pricePaise / 100)}</p>
        {!product.inStock ? <p className="text-sm text-muted">Out of stock</p> : null}
      </div>
    </Link>
  );
}
