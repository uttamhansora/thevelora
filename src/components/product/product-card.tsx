"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/components/storefront/providers";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { discountPercent, formatInr } from "@/lib/money";
import { ProductCardShareButton, ProductShareBar } from "@/components/product/product-share";

export type ProductCardData = {
  id?: string;
  slug: string;
  name: string;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  images: { url: string; alt?: string; width?: number | null; height?: number | null }[];
  inStock: boolean;
  variants?: { sku: string; pricePaise?: number; name?: string }[];
  fabric?: string;
  color?: string;
  pattern?: string;
  shortDescription?: string;
  description?: string;
  category?: { name: string; slug: string } | null;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  rating?: number;
  reviewCount?: number;
};

export type ProductCardProps = {
  product: ProductCardData;
  showActions?: boolean;
  showWishlist?: boolean;
  showQuickView?: boolean;
  aspectRatio?: "portrait" | "square" | "tall";
  className?: string;
  priority?: boolean;
};

export function ProductCard({
  product,
  showActions = true,
  showWishlist = true,
  showQuickView = true,
  aspectRatio = "portrait",
  className = "",
}: ProductCardProps) {
  const store = useStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewQty, setQuickViewQty] = useState(1);

  const primaryImage = product.images?.[0];
  const secondaryImage = product.images?.[1];
  const discount = discountPercent(product.pricePaise, product.compareAtPricePaise);
  const saved = product.id ? store.wishlist.some((item) => item.productId === product.id) : false;
  const defaultVariantSku = product.variants?.[0]?.sku ?? null;
  const productUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/products/${product.slug}`
      : `/products/${product.slug}`;

  function addToCart(event: MouseEvent<HTMLButtonElement>, quantity = 1) {
    event.preventDefault();
    event.stopPropagation();
    if (!product.id || !product.inStock) return;
    store.addToCart({
      productId: product.id,
      variantSku: product.variants && product.variants.length > 0 ? defaultVariantSku : null,
      quantity,
    });
    store.notify("Added to bag.");
  }

  function toggleWishlist(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!product.id) return;
    store.toggleWishlist({ productId: product.id, slug: product.slug, name: product.name });
    store.notify(saved ? "Removed from wishlist." : "Saved to wishlist.");
  }

  function handleOpenQuickView(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setQuickViewQty(1);
    setQuickViewOpen(true);
  }

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "tall"
        ? "aspect-[2/3]"
        : "aspect-[3/4]";

  return (
    <>
      <article
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] ${className}`}
      >
        {/* Visual Media Container */}
        <div className="relative overflow-hidden bg-[#faf6f2]">
          {/* Top-Left Discount Badge Pill: e.g. 6% OFF */}
          {discount != null ? (
            <span
              className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center rounded-md bg-black/80 px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-[2px]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {discount}% OFF
            </span>
          ) : null}

          {/* Top-Right Wishlist Heart Button (Clean outline directly on image) */}
          {showWishlist && product.id ? (
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              aria-pressed={saved}
              className="absolute right-3 top-3 z-10 p-1 transition hover:scale-110 active:scale-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
            >
              <Heart
                size={21}
                className={
                  saved
                    ? "fill-rose-500 text-rose-500"
                    : "stroke-white fill-none stroke-[2] transition-colors hover:text-rose-200"
                }
              />
            </button>
          ) : null}

          {/* Top-Right Share Button Popover */}
          <div className="absolute right-3 top-11 z-10">
            <ProductCardShareButton
              url={productUrl}
              title={product.name}
              image={primaryImage?.url}
            />
          </div>

          {/* Bottom-Center Quick View Button */}
          {showQuickView ? (
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:text-white backdrop-blur-sm shadow transition-all duration-200 hover:bg-black/90 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Eye size={12} strokeWidth={2} className="text-white shrink-0" />
              <span className="text-white">QUICK VIEW</span>
            </button>
          ) : null}

          {/* Out of Stock Overlay */}
          {!product.inStock ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text shadow">
                Out of stock
              </span>
            </div>
          ) : null}

          {/* Product Image Link */}
          <Link
            href={`/products/${product.slug}`}
            className={`relative block ${aspectClass} overflow-hidden`}
            tabIndex={-1}
          >
            <ImageWithFallback
              src={primaryImage?.url || "/images/fallbacks/product.jpg"}
              fallbackSrc="/images/fallbacks/product.jpg"
              alt={primaryImage?.alt || product.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {secondaryImage ? (
              <ImageWithFallback
                src={secondaryImage.url}
                fallbackSrc="/images/fallbacks/product.jpg"
                alt={secondaryImage.alt || product.name}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />
            ) : null}
          </Link>
        </div>

        {/* Product Information Area */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Product Title in Cormorant Garamond */}
          <Link
            href={`/products/${product.slug}`}
            className="font-serif text-[17px] font-normal leading-snug text-stone-900 tracking-tight transition-colors hover:text-primary sm:text-lg line-clamp-1"
            title={product.name}
          >
            {product.name}
          </Link>


          {/* Price Line: Selling Price & CompareAt Price (without footer percentage) */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">
              {formatInr(product.pricePaise)}
            </span>

            {product.compareAtPricePaise != null && product.compareAtPricePaise > product.pricePaise ? (
              <s className="text-xs font-normal text-stone-400 line-through sm:text-sm">
                {formatInr(product.compareAtPricePaise)}
              </s>
            ) : null}
          </div>

          {/* ADD TO BAG Button with proper refined typography */}
          {showActions ? (
            <div className="mt-auto pt-3.5">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/85 bg-white py-2 px-3 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-primary shadow-xs transition-all duration-150 hover:border-primary hover:bg-primary hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                disabled={!product.inStock || !product.id}
                onClick={(e) => addToCart(e, 1)}
              >
                <ShoppingBag size={13} strokeWidth={2} />
                <span>{product.inStock ? "ADD TO BAG" : "OUT OF STOCK"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </article>

      {/* QUICK VIEW Modal Dialog */}
      {quickViewOpen ? (
        <QuickViewModal
          product={product}
          discount={discount}
          quantity={quickViewQty}
          onQuantityChange={setQuickViewQty}
          onAddToCart={() => {
            if (!product.id || !product.inStock) return;
            store.addToCart({
              productId: product.id,
              variantSku: defaultVariantSku,
              quantity: quickViewQty,
            });
            store.notify(`Added ${quickViewQty} item(s) to bag.`);
            setQuickViewOpen(false);
          }}
          onClose={() => setQuickViewOpen(false)}
        />
      ) : null}
    </>
  );
}

function QuickViewModal({
  product,
  discount,
  quantity,
  onQuantityChange,
  onAddToCart,
  onClose,
}: {
  product: ProductCardData;
  discount: number | null;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  onClose: () => void;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIndex] || images[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-3 sm:p-4 md:p-6 lg:p-8 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg md:max-w-4xl lg:max-w-5xl flex-col overflow-y-auto md:overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row md:h-[620px] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-30 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white/95 text-stone-700 shadow-md transition hover:bg-stone-100 hover:text-black cursor-pointer"
          aria-label="Close Quick View"
        >
          <X size={18} />
        </button>

        {/* Media Column: Increased mobile height to h-[350px] sm:h-[400px] to display the full saree drape */}
        <div className="relative w-full h-[350px] sm:h-[400px] md:h-full md:w-1/2 bg-[#faf6f2] shrink-0 overflow-hidden flex flex-col justify-between">
          <div className="relative h-full w-full overflow-hidden">
            <ImageWithFallback
              src={currentImage?.url || "/images/fallbacks/product.jpg"}
              alt={currentImage?.alt || product.name}
              className="h-full w-full object-cover object-top transition-transform duration-500 ease-out"
            />
            {discount != null ? (
              <span className="absolute left-3.5 top-3.5 z-10 inline-flex items-center rounded-md bg-black/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-xs">
                {discount}% OFF
              </span>
            ) : null}
          </div>

          {/* Gallery Thumbnails Strip (if multiple images available) */}
          {images.length > 1 ? (
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-1.5 px-3">
              {images.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-11 w-9 sm:h-12 sm:w-10 overflow-hidden rounded-md border-2 transition-all cursor-pointer shadow-xs ${
                    idx === selectedImageIndex
                      ? "border-primary ring-2 ring-primary/40 scale-105"
                      : "border-white/80 opacity-75 hover:opacity-100"
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Info Column: Scrolls naturally with modal on mobile, clean inner scroll on desktop */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-9 md:overflow-y-auto">
          <div>
            {product.category?.name ? (
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-muted mb-1">
                {product.category.name}
              </p>
            ) : null}

            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-normal leading-tight text-stone-900 tracking-tight">
              {product.name}
            </h2>


            {/* Price Line */}
            <div className="mt-2.5 sm:mt-4 flex items-baseline gap-2.5 sm:gap-3">
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-stone-900">
                {formatInr(product.pricePaise)}
              </span>
              {product.compareAtPricePaise != null && product.compareAtPricePaise > product.pricePaise ? (
                <s className="text-xs sm:text-sm text-stone-400 line-through">
                  {formatInr(product.compareAtPricePaise)}
                </s>
              ) : null}
              {discount != null ? (
                <span className="rounded-full bg-[#fbeae8] px-2 py-0.5 text-[11px] sm:text-xs font-bold text-primary">
                  {discount}% off
                </span>
              ) : null}
            </div>

            {/* Short Description */}
            {product.shortDescription ? (
              <p className="mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed text-stone-600 line-clamp-2 sm:line-clamp-3">
                {product.shortDescription}
              </p>
            ) : null}

            {/* Fabric & Details Highlights */}
            <div className="mt-3 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-2.5 sm:p-3.5 text-xs">
              <div>
                <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Fabric</span>
                <span className="font-medium text-stone-800">{product.fabric || "Pure Silk / Handloom"}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Color</span>
                <span className="font-medium text-stone-800">{product.color || "As Shown"}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Availability</span>
                <span className={`font-semibold ${product.inStock ? "text-emerald-700" : "text-rose-700"}`}>
                  {product.inStock ? "● In Stock" : "○ Out of Stock"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Shipping</span>
                <span className="font-medium text-stone-800">Dispatch in 24–48h</span>
              </div>
            </div>

            {/* Social Share Row */}
            <ProductShareBar
              url={typeof window !== "undefined" ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`}
              title={product.name}
              image={currentImage?.url}
              className="mt-4"
            />
          </div>

          {/* Action Row: Sticky at bottom on mobile so CTA and Quantity are NEVER cut off */}
          <div className="sticky bottom-0 z-20 mt-4 sm:mt-6 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 p-3 sm:p-4 md:p-0 bg-white/95 backdrop-blur-xs border-t border-stone-200/80 md:border-stone-100 md:pt-5 md:bg-transparent md:backdrop-blur-none shadow-xs md:shadow-none">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Quantity Selector */}
              <div className="inline-flex items-center rounded-xl border border-border bg-stone-50 p-0.5 sm:p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg text-stone-700 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="grid h-9 min-w-8 sm:h-10 sm:min-w-10 place-items-center text-xs sm:text-sm font-bold text-stone-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg text-stone-700 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add to Bag CTA Button */}
              <button
                type="button"
                onClick={onAddToCart}
                disabled={!product.inStock}
                className="btn flex-1 gap-2 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <ShoppingBag size={15} />
                <span>{product.inStock ? "Add to bag" : "Out of stock"}</span>
              </button>
            </div>

            <Link
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="mt-2.5 sm:mt-3.5 block text-center text-xs font-semibold text-primary hover:text-primary-hover hover:underline underline-offset-4 tracking-wide"
            >
              View full product details →
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
