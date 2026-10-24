"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { productId: string; variantSku: string | null; quantity: number };
export type WishItem = { productId: string; slug: string; name: string };

type StoreContextValue = {
  cart: CartLine[];
  wishlist: WishItem[];
  addToCart: (item: CartLine) => void;
  updateQuantity: (productId: string, variantSku: string | null, quantity: number) => void;
  removeFromCart: (productId: string, variantSku: string | null) => void;
  clearCart: () => void;
  toggleWishlist: (item: WishItem) => void;
  toast: string;
  notify: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function sameLine(item: CartLine, productId: string, variantSku: string | null) {
  return item.productId === productId && item.variantSku === variantSku;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProviders({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCart(readJson<CartLine[]>("velora_cart_v1", []).filter((item) => item.productId && item.quantity > 0).slice(0, 20));
      setWishlist(readJson<WishItem[]>("velora_wishlist_v1", []).filter((item) => item.productId && item.slug).slice(0, 50));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("velora_cart_v1", JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem("velora_wishlist_v1", JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const value = useMemo<StoreContextValue>(() => ({
    cart,
    wishlist,
    toast,
    notify(message) {
      setToast(message);
      window.setTimeout(() => setToast(""), 2800);
    },
    addToCart(item) {
      setCart((current) => {
        const existing = current.find((line) => sameLine(line, item.productId, item.variantSku));
        if (!existing) return [...current, { ...item, quantity: Math.min(item.quantity, 10) }];
        return current.map((line) => sameLine(line, item.productId, item.variantSku) ? { ...line, quantity: Math.min(10, line.quantity + item.quantity) } : line);
      });
    },
    updateQuantity(productId, variantSku, quantity) {
      setCart((current) => current.flatMap((line) => {
        if (!sameLine(line, productId, variantSku)) return [line];
        if (quantity < 1) return [];
        return [{ ...line, quantity: Math.min(10, quantity) }];
      }));
    },
    removeFromCart(productId, variantSku) {
      setCart((current) => current.filter((line) => !sameLine(line, productId, variantSku)));
    },
    clearCart() { setCart([]); },
    toggleWishlist(item) {
      setWishlist((current) => current.some((entry) => entry.productId === item.productId) ? current.filter((entry) => entry.productId !== item.productId) : [...current, item]);
    },
  }), [cart, wishlist, toast]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      {toast ? <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-text px-4 py-2 text-sm text-white">{toast}</div> : null}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store providers are missing.");
  return value;
}
