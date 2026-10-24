"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [message, setMessage] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), mobile: form.get("mobile") || "", message: form.get("message") }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Message received. The store will reply using the contact details it has published." : data.error || "Unable to send the message.");
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-serif text-5xl">Contact</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input className="field" name="name" required placeholder="Name" />
        <input className="field" name="email" type="email" required placeholder="Email" />
        <input className="field" name="mobile" placeholder="Mobile, optional" />
        <textarea className="field min-h-32" name="message" required minLength={10} placeholder="Message" />
        <button className="btn" type="submit">Send</button>
        {message ? <p>{message}</p> : null}
      </form>
    </div>
  );
}
