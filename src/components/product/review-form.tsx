"use client";

import { FormEvent, useState } from "react";

export function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId,
        name: form.get("name"),
        rating: Number(form.get("rating")),
        body: form.get("body"),
      }),
    });
    const data = await response.json();
    setMessage(response.ok ? data.message : data.error || "Unable to submit the review.");
    if (response.ok) event.currentTarget.reset();
  }
  return (
    <form onSubmit={onSubmit} className="mt-6 grid max-w-lg gap-3">
      <h3 className="font-serif text-2xl">Write a review</h3>
      <input className="field" name="name" required placeholder="Name" />
      <select className="field" name="rating" defaultValue="5" aria-label="Rating">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <textarea className="field min-h-28" name="body" required minLength={10} placeholder="What should other shoppers know?" />
      <button className="btn" type="submit">Submit for moderation</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
