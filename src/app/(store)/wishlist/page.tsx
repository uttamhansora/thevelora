"use client";

import Link from "next/link";
import { useStore } from "@/components/storefront/providers";
import { EmptyState } from "@/components/shared/states";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useStore();
  if (wishlist.length === 0) return <div className="mx-auto max-w-3xl px-4 py-12"><EmptyState title="Wishlist is empty" body="Saved pieces stay on this device. An account is not required." /></div>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-5xl">Wishlist</h1>
      <ul className="mt-6 grid gap-3">
        {wishlist.map((item) => (
          <li key={item.productId} className="card flex items-center justify-between p-4">
            <Link href={`/products/${item.slug}`}>{item.name}</Link>
            <button type="button" onClick={() => toggleWishlist(item)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
