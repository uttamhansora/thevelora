"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { PriceDisplay } from "@/components/shared/price-display";
import { useStore } from "@/components/storefront/providers";

type Variant = { sku: string; name: string; pricePaise: number; stockQuantity: number };

export function PurchasePanel({ product }: { product: { id: string; slug: string; name: string; sku: string; pricePaise: number; compareAtPricePaise: number | null; inStock: boolean; purchasable: boolean; variants: Variant[] } }) {
  const router = useRouter();
  const store = useStore();
  const [variantSku, setVariantSku] = useState(product.variants[0]?.sku ?? "");
  const [quantity, setQuantity] = useState(1);
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const variant = product.variants.find((item) => item.sku === variantSku);
  const price = variant?.pricePaise ?? product.pricePaise;
  const stock = variant ? variant.stockQuantity : product.inStock ? 10 : 0;
  const saved = store.wishlist.some((item) => item.productId === product.id);
  const disabled = !product.purchasable || stock < 1 || (product.variants.length > 0 && !variant);

  function buyNow() {
    if (disabled) return;
    store.addToCart({ productId: product.id, variantSku: variant?.sku ?? null, quantity });
    router.push("/checkout");
  }

  function add() {
    if (disabled) return;
    store.addToCart({ productId: product.id, variantSku: variant?.sku ?? null, quantity });
    store.notify("Added to bag.");
  }

  async function checkPin(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [], pinCode: pin, couponCode: "" }),
    });
    const data = await response.json();
    setPinMessage(data.pin?.message || data.error || "Unable to check this PIN code.");
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">SKU {product.sku}</p>
      <PriceDisplay pricePaise={price} compareAtPricePaise={product.compareAtPricePaise} />
      {product.variants.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm">Variant</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((item) => (
              <button key={item.sku} type="button" className={`rounded-full border px-3 py-2 ${item.sku === variantSku ? "border-primary bg-primary text-white" : "border-border"}`} onClick={() => setVariantSku(item.sku)}>
                {item.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex items-center gap-3">
        <label htmlFor="qty">Quantity</label>
        <button type="button" className="btn btn-secondary px-3" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">-</button>
        <input id="qty" className="field w-16 text-center" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} />
        <button type="button" className="btn btn-secondary px-3" onClick={() => setQuantity((value) => Math.min(10, value + 1))} aria-label="Increase quantity">+</button>
      </div>
      <p>{stock > 0 ? `${stock} available` : "Out of stock"}</p>
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <button className="btn w-full sm:w-auto" type="button" disabled={disabled} onClick={add}>Add to Cart</button>
        <button className="btn btn-secondary w-full sm:w-auto" type="button" disabled={disabled} onClick={buyNow}>Buy Now</button>
        <button type="button" className="btn btn-secondary w-full sm:w-auto" aria-pressed={saved} onClick={() => store.toggleWishlist({ productId: product.id, slug: product.slug, name: product.name })}>
          <Heart size={16} /> {saved ? "Saved" : "Wishlist"}
        </button>
      </div>
      <form onSubmit={checkPin} className="grid gap-2">
        <label htmlFor="pin">Delivery PIN code</label>
        <div className="flex min-w-0 gap-2">
          <input id="pin" className="field min-w-0 flex-1" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="6-digit PIN" />
          <button className="btn btn-secondary shrink-0" type="submit">Check</button>
        </div>
        {pinMessage ? <p className="text-sm text-muted">{pinMessage}</p> : null}
      </form>
    </div>
  );
}
