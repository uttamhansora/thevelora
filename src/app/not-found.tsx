import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-serif text-6xl text-primary">404</p>
      <h1 className="mt-3 font-serif text-4xl">This page is not in the edit</h1>
      <Link className="btn mt-6" href="/">Back home</Link>
    </div>
  );
}
