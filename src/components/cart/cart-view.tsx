"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/storefront/providers";
import { EmptyState } from "@/components/shared/states";
import { formatInr } from "@/lib/money";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

type QuoteItem = {
  id?: string;
  productId?: string;
  name?: string;
  slug?: string;
  variantSku: string | null;
  variantName?: string;
  images?: { url: string; alt: string }[];
  available: boolean;
  quantity: number;
  unitPricePaise?: number;
  lineTotalPaise?: number;
  message?: string;
};

type Quote = {
  items: QuoteItem[];
  totals: { subtotalPaise: number; discountPaise: number; shippingCostPaise: number; taxPaise: number; totalPaise: number };
  couponMessage: string;
};

export function CartView() {
  const store = useStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (store.cart.length === 0) {
        setQuote(null);
        return;
      }
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: store.cart, couponCode: coupon }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Unable to refresh prices.");
      else {
        setError("");
        setQuote(data);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [store.cart, coupon]);

  if (store.cart.length === 0) {
    return <EmptyState title="Your bag is empty" body="Saved pieces will stay on this device until you check out." action={<Link className="btn" href="/collections/sarees">Continue shopping</Link>} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <div className="grid gap-4">
        {store.cart.map((line) => {
          const priced = quote?.items.find((item) => (item.id === line.productId || item.productId === line.productId) && item.variantSku === line.variantSku);
          return (
            <article key={`${line.productId}-${line.variantSku}`} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="flex h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-rose/40 sm:h-32 sm:w-24">
                {priced?.images?.[0] ? <ImageWithFallback src={priced.images[0].url} alt={priced.images[0].alt || priced.name || "Product"} className="h-full w-full object-cover" /> : <ImageWithFallback src="/images/fallbacks/product.jpg" alt="Product placeholder" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-xl leading-tight sm:text-2xl">{priced?.name || "Product"}</h2>
                <p className="text-sm text-muted">{priced?.variantName}</p>
                <p>{priced?.unitPricePaise != null ? formatInr(priced.unitPricePaise) : "Checking price"}</p>
                {priced?.message ? <p className="text-sm text-primary">{priced.message}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button className="btn btn-secondary px-3" type="button" onClick={() => store.updateQuantity(line.productId, line.variantSku, line.quantity - 1)} aria-label="Decrease quantity">-</button>
                  <span>{line.quantity}</span>
                  <button className="btn btn-secondary px-3" type="button" onClick={() => store.updateQuantity(line.productId, line.variantSku, line.quantity + 1)} aria-label="Increase quantity">+</button>
                  <button className="text-sm underline" type="button" onClick={() => store.removeFromCart(line.productId, line.variantSku)}>Remove</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="card h-fit p-5 lg:sticky lg:top-24">
        <h2 className="font-serif text-3xl">Summary</h2>
        <label className="mt-4 block text-sm" htmlFor="coupon">Coupon</label>
        <input id="coupon" className="field mt-1" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} />
        {quote?.couponMessage ? <p className="mt-2 text-sm text-primary">{quote.couponMessage}</p> : null}
        {error ? <p className="mt-2 text-sm text-primary">{error}</p> : null}
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote ? formatInr(quote.totals.subtotalPaise) : "—"}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>{quote ? formatInr(quote.totals.discountPaise) : "—"}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{quote ? formatInr(quote.totals.shippingCostPaise) : "—"}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd>{quote ? formatInr(quote.totals.totalPaise) : "—"}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">The final amount is calculated again on the server when the order is created.</p>
        <Link className="btn mt-4 w-full" href="/checkout">Proceed to Checkout</Link>
        <Link className="btn btn-secondary mt-3 w-full" href="/collections/sarees">Continue Shopping</Link>
      </aside>
    </div>
  );
}
