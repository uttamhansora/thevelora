"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Heart, Menu, Minus, Plus, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import { useStore } from "@/components/storefront/providers";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { PriceDisplay } from "@/components/shared/price-display";
import { discountPercent, formatInr } from "@/lib/money";
import type { StoreSettingsData } from "@/lib/validation/settings";

const BRAND_SOCIAL = {
  instagram: "https://www.instagram.com/the_veloraa.in/",
  facebook: "https://www.facebook.com/profile.php?id=61595954965283",
} as const;

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.75l.42-3H13.5V9.26c0-.86.24-1.45 1.48-1.45H16.9V5.14c-.26-.04-1.16-.11-2.2-.11-2.18 0-3.67 1.33-3.67 3.77V11H8.5v3h2.53v8h2.47z" />
    </svg>
  );
}

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
  const [customerName, setCustomerName] = useState("");
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const signedIn = customerName.length > 0;
  const accountHref = signedIn ? "/account" : "/login";
  const accountLabel = signedIn ? `Account, ${customerName}` : "Sign in";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setCustomerName(data.customer?.name?.trim() ?? ""))
      .catch(() => setCustomerName(""));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 px-4 py-2 sm:grid-cols-[6.5rem_1fr_6.5rem] sm:px-6 sm:py-2.5 lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Mobile / Tablet Menu Button (Left) */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/70 text-primary transition hover:bg-gold/15 active:scale-95"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Logo Lockup: Centered on Mobile/Tablet, Left on Desktop */}
        <Link
          href="/"
          className="group col-start-2 flex items-center justify-center gap-2.5 transition-transform hover:opacity-95 sm:gap-3.5 lg:col-auto lg:justify-start"
        >
          <img
            src="/images/brand/velora-logo.jpg"
            alt="The Velora"
            className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-gold/40 transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
            width={64}
            height={64}
          />
          <span className="flex items-end font-serif select-none" aria-label="The Velora">
            <span className="font-serif text-[1.85rem] font-semibold tracking-[0.05em] text-primary sm:text-[2.2rem] lg:text-[2.5rem] leading-none">
              Vel
            </span>
            <span className="inline-flex flex-col items-center leading-none">
              <span className="font-serif text-[10px] font-bold uppercase tracking-[0.28em] text-gold sm:text-[11px] lg:text-[13px] leading-none -mb-1 sm:-mb-1.5 pl-0.5">
                THE
              </span>
              <span className="font-serif text-[1.85rem] font-semibold tracking-[0.05em] text-primary sm:text-[2.2rem] lg:text-[2.5rem] leading-none">
                ora
              </span>
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Menu: Preserving refined text-sm font-medium */}
        <nav className="ml-6 hidden items-center gap-4 text-sm font-medium lg:flex xl:gap-6" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1 text-text/80 transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls (Search, Wishlist, Account, Cart) */}
        <div className="col-start-3 flex items-center justify-end gap-1 sm:gap-1.5 lg:col-auto lg:ml-auto">
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-text transition hover:bg-gold/15 hover:text-primary"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={19} />
          </button>

          <Link
            href="/wishlist"
            className="relative hidden h-10 w-10 place-items-center rounded-full text-text transition hover:bg-gold/15 hover:text-primary sm:grid"
            aria-label={`Wishlist, ${wishlist.length} items`}
          >
            <Heart size={19} />
            {wishlist.length > 0 ? (
              <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white shadow-sm">
                {wishlist.length}
              </span>
            ) : null}
          </Link>

          <Link
            href={accountHref}
            className="hidden max-w-[11rem] items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-text transition hover:bg-gold/15 hover:text-primary lg:flex"
            aria-label={accountLabel}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full">
              <UserRound size={19} />
            </span>
            {signedIn ? <span className="truncate text-sm font-medium">{customerName}</span> : null}
          </Link>

          <button
            className="relative grid h-10 w-10 place-items-center rounded-full text-text transition hover:bg-gold/15 hover:text-primary"
            aria-label={`Cart, ${count} items`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={19} />
            {count > 0 ? (
              <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      {open ? (
        <MobileNavigation
          accountHref={accountHref}
          accountLabel={accountLabel}
          cartCount={count}
          customerName={customerName}
          signedIn={signedIn}
          wishlistCount={wishlist.length}
          onClose={() => setOpen(false)}
          onOpenCart={() => {
            setOpen(false);
            setCartOpen(true);
          }}
        />
      ) : null}
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
      {cartOpen ? <CartDrawer onClose={() => setCartOpen(false)} /> : null}
    </header>
  );
}

function MobileNavigation({
  onClose,
  onOpenCart,
  wishlistCount,
  cartCount,
  accountHref,
  accountLabel,
  customerName,
  signedIn,
}: {
  onClose: () => void;
  onOpenCart: () => void;
  wishlistCount: number;
  cartCount: number;
  accountHref: string;
  accountLabel: string;
  customerName: string;
  signedIn: boolean;
}) {
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
            <div className="flex items-center gap-2.5">
              <img
                src="/images/brand/velora-logo.jpg"
                alt="The Velora"
                className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-gold/40 shadow-sm"
                width={44}
                height={44}
              />
              <span className="flex items-end font-serif select-none" aria-label="The Velora">
                <span className="font-serif text-2xl font-semibold tracking-[0.05em] text-primary leading-none">
                  Vel
                </span>
                <span className="inline-flex flex-col items-center leading-none">
                  <span className="font-serif text-[9px] font-bold uppercase tracking-[0.26em] text-gold leading-none -mb-1 pl-0.5">
                    THE
                  </span>
                  <span className="font-serif text-2xl font-semibold tracking-[0.05em] text-primary leading-none">
                    ora
                  </span>
                </span>
              </span>
            </div>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-border text-text hover:bg-rose/20 active:scale-95 transition" aria-label="Close menu" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="mt-4 grid gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="-mx-4 flex items-center rounded-xl px-4 py-2.5 text-lg font-medium text-text transition hover:bg-rose/30 hover:text-primary active:scale-[0.99]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-1 border-t border-border pt-4">
            <Link
              href="/wishlist"
              onClick={onClose}
              className="-mx-4 flex items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium text-text transition hover:bg-rose/30 hover:text-primary"
            >
              <Heart size={18} />
              <span>Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}</span>
            </Link>
            <Link
              href={accountHref}
              onClick={onClose}
              className="-mx-4 flex items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium text-text transition hover:bg-rose/30 hover:text-primary"
              aria-label={accountLabel}
            >
              <UserRound size={18} />
              <span className="truncate">{signedIn ? customerName : "Sign in"}</span>
            </Link>
            <button
              type="button"
              onClick={onOpenCart}
              className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 rounded-xl px-4 py-2.5 text-left text-base font-medium text-text transition hover:bg-rose/30 hover:text-primary"
            >
              <ShoppingBag size={18} />
              <span>Your bag{cartCount > 0 ? ` (${cartCount})` : ""}</span>
            </button>
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

type DrawerQuoteItem = {
  id?: string;
  productId?: string;
  name?: string;
  slug?: string;
  variantSku?: string | null;
  variantName?: string;
  images?: { url: string; alt: string }[];
  available?: boolean;
  quantity?: number;
  unitPricePaise?: number;
  lineTotalPaise?: number;
  message?: string;
};

type DrawerQuote = {
  items: DrawerQuoteItem[];
  totals: {
    subtotalPaise: number;
    discountPaise: number;
    shippingCostPaise: number;
    taxPaise: number;
    totalPaise: number;
  };
  couponMessage?: string;
};

function CartDrawer({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { cart, updateQuantity, removeFromCart } = store;
  const [quote, setQuote] = useState<DrawerQuote | null>(null);
  const quantity = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      fetch("/api/cart/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: cart }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            setQuote(data);
          }
        })
        .catch(() => {});
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cart]);

  const subtotalPaise =
    quote?.totals?.subtotalPaise ??
    cart.reduce((sum, line) => {
      const match = quote?.items?.find(
        (item) => item.id === line.productId || item.productId === line.productId
      );
      return sum + (match?.unitPricePaise ?? 0) * line.quantity;
    }, 0);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[100] flex justify-end bg-text/55"
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        onClick={onClose}
      >
        <aside
          className="flex h-full w-full max-w-md flex-col bg-background shadow-[-12px_0_40px_rgba(48,37,31,0.15)]"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-5 sm:p-6 pb-4">
            <div>
              <h2 className="font-serif text-3xl text-text">Your bag</h2>
              <p className="mt-1 text-xs text-muted">
                {cart.length === 0
                  ? "Your bag is currently empty"
                  : `${quantity} item${quantity === 1 ? "" : "s"} ready for checkout`}
              </p>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-text transition hover:bg-rose/20 active:scale-95"
              aria-label="Close cart"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-rose/30 text-primary">
                <ShoppingBag size={34} />
              </div>
              <h3 className="mt-5 font-serif text-2xl text-text">Your bag is empty</h3>
              <p className="mt-2 max-w-xs text-sm text-muted">
                Browse our curated catalogue of handwoven sarees to find your next drape.
              </p>
              <Link
                className="btn mt-6 px-6 py-2.5 text-sm"
                href="/collections/sarees"
                onClick={onClose}
              >
                Explore collection
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
              {cart.map((line) => {
                const priced = quote?.items?.find(
                  (item) =>
                    (item.id === line.productId || item.productId === line.productId) &&
                    (item.variantSku ?? null) === (line.variantSku ?? null)
                );
                const image = priced?.images?.[0];
                const name = priced?.name || "Product";
                const slug = priced?.slug;
                const unitPrice = priced?.unitPricePaise;
                const lineTotal = priced?.lineTotalPaise ?? (unitPrice ? unitPrice * line.quantity : null);

                return (
                  <article
                    key={`${line.productId}-${line.variantSku ?? "default"}`}
                    className="group relative flex gap-3.5 rounded-2xl border border-border/80 bg-surface p-3.5 shadow-sm transition hover:border-gold/50"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-rose/30">
                      {slug ? (
                        <Link href={`/products/${slug}`} onClick={onClose} className="block h-full w-full">
                          <ImageWithFallback
                            src={image?.url || "/images/fallbacks/product.jpg"}
                            alt={image?.alt || name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <ImageWithFallback
                          src={image?.url || "/images/fallbacks/product.jpg"}
                          alt={image?.alt || name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          {slug ? (
                            <Link
                              href={`/products/${slug}`}
                              onClick={onClose}
                              className="font-serif text-base font-medium leading-snug text-text transition hover:text-primary line-clamp-2"
                            >
                              {name}
                            </Link>
                          ) : (
                            <h3 className="font-serif text-base font-medium leading-snug text-text line-clamp-2">
                              {name}
                            </h3>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.productId, line.variantSku)}
                            className="p-1 -mr-1 text-muted transition hover:text-primary"
                            aria-label={`Remove ${name} from bag`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {priced?.variantName ? (
                          <p className="mt-0.5 text-xs text-muted">{priced.variantName}</p>
                        ) : null}

                        {/* Price Display */}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm font-bold text-text">
                            {lineTotal != null ? formatInr(lineTotal) : "..."}
                          </span>
                          {line.quantity > 1 && unitPrice != null ? (
                            <span className="text-[11px] text-muted">
                              ({formatInr(unitPrice)} each)
                            </span>
                          ) : null}
                        </div>

                        {priced?.message ? (
                          <p className="mt-1 text-xs text-primary font-medium">{priced.message}</p>
                        ) : null}
                      </div>

                      {/* Quantity Controls */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5 shadow-inner">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, line.variantSku, line.quantity - 1)}
                            className="grid h-7 w-7 place-items-center rounded text-text transition hover:bg-rose/30 hover:text-primary disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="grid h-7 min-w-7 place-items-center text-xs font-semibold text-text">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, line.variantSku, line.quantity + 1)}
                            className="grid h-7 w-7 place-items-center rounded text-text transition hover:bg-rose/30 hover:text-primary"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Footer with subtotal and actions */}
          {cart.length > 0 ? (
            <div className="border-t border-border bg-surface/50 p-5 sm:p-6 pt-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium text-text">Subtotal</span>
                <span className="font-serif text-2xl font-bold text-text">
                  {subtotalPaise > 0 ? formatInr(subtotalPaise) : "..."}
                </span>
              </div>
              <p className="text-xs text-muted mb-4">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="grid gap-2.5">
                <Link
                  className="btn w-full py-3 text-sm font-semibold tracking-wide shadow-md"
                  href="/checkout"
                  onClick={onClose}
                >
                  Proceed to checkout
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="btn btn-secondary w-full py-2.5 text-xs font-semibold"
                    href="/cart"
                    onClick={onClose}
                  >
                    View cart
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary w-full py-2.5 text-xs font-semibold"
                    onClick={onClose}
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </BodyPortal>
  );
}

export function SiteFooter({ settings }: { settings: StoreSettingsData }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 py-12 md:grid-cols-4">
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
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={settings.social.instagram || BRAND_SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 w-11 place-items-center rounded-full border border-gold text-primary transition-colors hover:bg-gold/10"
              aria-label="Instagram — The Velora"
            >
              <IconInstagram />
            </a>
            <a
              href={settings.social.facebook || BRAND_SOCIAL.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 w-11 place-items-center rounded-full border border-gold text-primary transition-colors hover:bg-gold/10"
              aria-label="Facebook — The Velora"
            >
              <IconFacebook />
            </a>
            {settings.social.pinterest ? (
              <a href={settings.social.pinterest} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary">
                Pinterest
              </a>
            ) : null}
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
    <form onSubmit={onSubmit} className="mx-auto grid max-w-6xl gap-3 border-t border-border px-4 sm:px-6 py-8 md:grid-cols-[1fr_auto_auto] md:items-center">
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

export { ProductCard, type ProductCardData, type ProductCardProps } from "@/components/product/product-card";
