import type { Metadata } from "next";
import { CustomerRegisterForm } from "@/components/storefront/customer-auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[min(72vh,720px)] max-w-6xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <CustomerRegisterForm />
      </div>
    </div>
  );
}
