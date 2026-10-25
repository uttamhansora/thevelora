import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10"><h1 className="mb-6 font-serif text-4xl sm:text-5xl">Your bag</h1><CartView /></div>;
}
