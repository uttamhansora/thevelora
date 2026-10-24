"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Unable to sign in.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/admin";
    router.push(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="font-serif text-3xl tracking-[0.16em] text-primary">THE VELORA</p>
      <h1 className="mt-2 font-serif text-4xl">Administrator sign in</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">Email<input className="field" name="email" type="email" autoComplete="username" required /></label>
        <label className="grid gap-1 text-sm">Password<input className="field" name="password" type="password" autoComplete="current-password" required /></label>
        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <button className="btn" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
