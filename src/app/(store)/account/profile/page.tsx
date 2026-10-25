import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/storefront/account-nav";
import { CustomerProfileForm } from "@/components/storefront/customer-profile-form";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/login?next=/account/profile");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <AccountNav current="profile" />
      <CustomerProfileForm name={customer.name} mobile={customer.mobile} email={customer.email} hasPassword={customer.hasPassword} />
    </div>
  );
}
