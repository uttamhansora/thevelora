import Link from "next/link";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-5xl">Account</h1>
      <p className="mt-4 text-muted">Checkout does not require an account. Your bag and wishlist stay in this browser. Order updates are available from the private link shown after you place an order.</p>
      <Link className="btn mt-6" href="/admin/login">Store administration</Link>
    </div>
  );
}
