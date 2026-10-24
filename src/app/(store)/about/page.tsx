import type { Metadata } from "next";
import { getStoreSettingsSafe } from "@/services/settings";

export const metadata: Metadata = { title: "About Us" };

export default async function AboutPage() {
  const { settings } = await getStoreSettingsSafe();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm uppercase tracking-[0.2em] text-gold">THE VELORA</p>
      <h1 className="mt-2 font-serif text-5xl">{settings.brandStory.title}</h1>
      <p className="mt-6 text-lg leading-8 text-muted">{settings.brandStory.body}</p>
      <p className="mt-6 leading-7">Elegance Woven for You. The house edits sarees and ethnic wear for everyday dressing and festive occasions, with prices confirmed on the server at checkout.</p>
    </article>
  );
}
