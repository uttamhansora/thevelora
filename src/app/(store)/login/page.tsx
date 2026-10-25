import type { Metadata } from "next";
import { CustomerLoginForm } from "@/components/storefront/customer-auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[min(72vh,720px)] max-w-6xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <CustomerLoginForm />
      </div>
    </div>
  );
}
