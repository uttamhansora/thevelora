import type { Metadata } from "next";
import { CustomerRegisterForm } from "@/components/storefront/customer-auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return <div className="mx-auto max-w-6xl px-4 py-12"><CustomerRegisterForm /></div>;
}
