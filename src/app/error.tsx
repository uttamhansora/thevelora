"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted">Please try again. If this continues, the store database or configuration needs attention.</p>
      <button className="btn mt-6" type="button" onClick={reset}>Try again</button>
    </div>
  );
}
