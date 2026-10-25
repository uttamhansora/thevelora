import Link from "next/link";
import { CustomerLogoutButton } from "@/components/storefront/customer-auth-forms";
import { AccountNav } from "@/components/storefront/account-nav";
import { getCustomerSession } from "@/lib/auth/customer-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const customer = await getCustomerSession();
  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-serif text-5xl">Account</h1>
        <p className="mt-4 text-muted">Sign in to see your saved details, or create an account before checkout. Placing an order with your mobile number also registers you automatically.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn" href="/login">Sign in</Link>
          <Link className="btn btn-secondary" href="/register">Create account</Link>
        </div>
        <p className="mt-8 text-sm text-muted">Order updates are always available from the private link shown after checkout.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <AccountNav current="overview" />
      <h1 className="font-serif text-5xl">Hello, {customer.name}</h1>
      <div className="card mt-6 grid gap-2 p-5 text-sm">
        <p><span className="text-muted">Mobile:</span> {customer.mobile}</p>
        {customer.email ? <p><span className="text-muted">Email:</span> {customer.email}</p> : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn" href="/account/profile">Edit profile</Link>
        <Link className="btn btn-secondary" href="/account/orders">View orders</Link>
      </div>
      {!customer.hasPassword ? (
        <p className="mt-6 text-sm text-muted">
          Add a password on your <Link className="underline" href="/account/profile">profile</Link> so you can sign in with your mobile number later.
        </p>
      ) : null}
      <p className="mt-6 text-sm text-muted">Your bag and wishlist stay on this device.</p>
      <CustomerLogoutButton />
    </div>
  );
}
