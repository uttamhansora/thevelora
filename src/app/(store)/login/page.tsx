import type { Metadata } from "next";
import { CustomerLoginForm } from "@/components/storefront/customer-auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return <div className="mx-auto max-w-6xl px-4 py-12"><CustomerLoginForm /></div>;
}
