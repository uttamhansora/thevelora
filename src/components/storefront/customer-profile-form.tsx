"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  name: string;
  mobile: string;
  email: string;
  hasPassword: boolean;
};

export function CustomerProfileForm({ name, mobile, email, hasPassword }: Props) {
  const router = useRouter();
  const [formName, setFormName] = useState(name);
  const [formEmail, setFormEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: formName, email: formEmail }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPending(false);
      setError(data.error || "Unable to update profile.");
      return;
    }
    if (password.trim()) {
      const passwordResponse = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const passwordData = await passwordResponse.json();
      setPending(false);
      if (!passwordResponse.ok) {
        setError(passwordData.error || "Profile saved, but the password could not be updated.");
        router.refresh();
        return;
      }
      setPassword("");
    } else {
      setPending(false);
    }
    setMessage("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 p-5 sm:p-6">
      <h1 className="font-serif text-4xl">Profile</h1>
      <p className="text-sm text-muted">Update your contact details used at checkout.</p>
      <label className="grid gap-1 text-sm">
        Full name
        <input className="field" value={formName} onChange={(event) => setFormName(event.target.value)} autoComplete="name" required />
      </label>
      <label className="grid gap-1 text-sm">
        Mobile
        <input className="field" value={mobile} readOnly disabled />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <input className="field" type="email" value={formEmail} onChange={(event) => setFormEmail(event.target.value)} autoComplete="email" />
      </label>
      <label className="grid gap-1 text-sm">
        {hasPassword ? "New password (optional)" : "Password"}
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={hasPassword ? undefined : 8}
          required={!hasPassword}
          placeholder={hasPassword ? "Leave blank to keep current password" : "At least 8 characters"}
        />
      </label>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
