import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreSettingsSafe } from "@/services/settings";

export const dynamic = "force-dynamic";

const titles = { privacy: "Privacy", returns: "Returns", terms: "Terms" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: titles[slug as keyof typeof titles] || "Policy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in titles)) notFound();
  const { settings } = await getStoreSettingsSafe();
  const body = settings.policies[slug as keyof typeof titles];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-5xl">{titles[slug as keyof typeof titles]}</h1>
      <p className="mt-3 text-sm text-muted">This page shows the policy text saved in store settings. It is not presented as a legally verified document.</p>
      <div className="mt-6 whitespace-pre-wrap leading-7">{body}</div>
    </article>
  );
}
