import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/storefront/site-chrome";
import { StoreProviders } from "@/components/storefront/providers";
import { getStoreSettingsSafe } from "@/services/settings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { settings, unavailable } = await getStoreSettingsSafe();
  return (
    <StoreProviders>
      <AnnouncementBar settings={settings} />
      {unavailable ? <p className="bg-rose px-4 py-2 text-center text-sm">The catalogue is temporarily unavailable. Please try again shortly.</p> : null}
      <SiteHeader />
      <main id="content" className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </StoreProviders>
  );
}
