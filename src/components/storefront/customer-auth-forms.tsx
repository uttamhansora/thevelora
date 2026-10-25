"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobile: form.get("mobile"), password: form.get("password") }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Unable to sign in.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card grid w-full gap-3 p-5 sm:p-6">
      <h1 className="text-center font-serif text-4xl">Sign in</h1>
      <p className="text-center text-sm text-muted">Use the mobile number and password from your account.</p>
      <label className="grid gap-1 text-sm">Mobile<input className="field" name="mobile" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" required /></label>
      <label className="grid gap-1 text-sm">Password<input className="field" name="password" type="password" autoComplete="current-password" required /></label>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-muted">New here? <Link className="underline" href="/register">Create an account</Link></p>
    </form>
  );
}

export function CustomerRegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        mobile: form.get("mobile"),
        email: form.get("email") || "",
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Unable to create your account.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card grid w-full gap-3 p-5 sm:p-6">
      <h1 className="text-center font-serif text-4xl">Create account</h1>
      <p className="text-center text-sm text-muted">Register to save your details for faster checkout.</p>
      <label className="grid gap-1 text-sm">Full name<input className="field" name="name" autoComplete="name" required /></label>
      <label className="grid gap-1 text-sm">Mobile<input className="field" name="mobile" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" required /></label>
      <label className="grid gap-1 text-sm">Email (optional)<input className="field" name="email" type="email" autoComplete="email" /></label>
      <label className="grid gap-1 text-sm">Password<input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm text-muted">Already registered? <Link className="underline" href="/login">Sign in</Link></p>
    </form>
  );
}

export function CustomerSetPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: form.get("password") }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Unable to save password.");
      return;
    }
    setMessage("Password saved. You can use it the next time you sign in.");
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 grid max-w-md gap-3 p-5">
      <h2 className="font-serif text-3xl">Set a password</h2>
      <p className="text-sm text-muted">If you checked out as a guest, add a password so you can sign in with your mobile number later.</p>
      <label className="grid gap-1 text-sm">Password<input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <button className="btn btn-secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}

export function CustomerLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return <button className="btn btn-secondary mt-6" type="button" disabled={pending} onClick={onLogout}>{pending ? "Signing out…" : "Sign out"}</button>;
}
