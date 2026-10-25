import { z } from "zod";
import { paiseSchema } from "@/lib/validation/common";

const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(240),
});

const imageSchema = z.object({
  url: z.string().trim().max(500).default(""),
  alt: z.string().trim().max(180).default(""),
});

export const storeSettingsSchema = z.object({
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string().trim().max(180),
    href: z.string().trim().max(240).default(""),
  }),
  hero: z.object({
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(240),
    desktopImage: imageSchema,
    mobileImage: imageSchema,
    primaryCtaLabel: z.string().trim().min(1).max(40),
    primaryCtaHref: z.string().trim().min(1).max(240),
    secondaryCtaLabel: z.string().trim().min(1).max(40),
    secondaryCtaHref: z.string().trim().min(1).max(240),
  }),
  sections: z.object({
    categories: z.boolean(),
    bestSellers: z.boolean(),
    newArrivals: z.boolean(),
    featured: z.boolean(),
    brandStory: z.boolean(),
    whyShop: z.boolean(),
    policies: z.boolean(),
  }),
  categoryCards: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        href: z.string().trim().min(1).max(240),
        image: imageSchema,
      }),
    )
    .max(8),
  featuredCollectionSlugs: z.array(z.string().trim().max(80)).max(6),
  brandStory: z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(2000),
    image: imageSchema,
  }),
  whyShop: z.array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().min(1).max(400) })).max(6),
  contact: z.object({
    email: z.string().trim().max(160).default(""),
    phone: z.string().trim().max(20).default(""),
    address: z.string().trim().max(400).default(""),
  }),
  social: z.object({
    instagram: z.string().trim().max(240).default(""),
    facebook: z.string().trim().max(240).default(""),
    pinterest: z.string().trim().max(240).default(""),
  }),
  footerLinks: z.array(linkSchema).max(12),
  policies: z.object({
    privacy: z.string().trim().max(20000),
    returns: z.string().trim().max(20000),
    terms: z.string().trim().max(20000),
  }),
  shipping: z.object({
    flatRatePaise: paiseSchema,
    freeShippingThresholdPaise: paiseSchema,
    serviceablePinPrefixes: z.array(z.string().regex(/^\d{1,6}$/)).max(50),
    blockedPinPrefixes: z.array(z.string().regex(/^\d{1,6}$/)).max(50),
    deliveryNote: z.string().trim().max(800),
  }),
  payment: z.object({
    merchantUpiId: z.string().trim().max(100).default(""),
    merchantName: z.string().trim().min(1).max(80),
    instructions: z.string().trim().max(2000),
  }),
  tax: z.object({
    rateBps: z.number().int().min(0).max(10000),
    pricesIncludeTax: z.boolean(),
    note: z.string().trim().max(800),
  }),
  seo: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
  }),
});

export type StoreSettingsData = z.infer<typeof storeSettingsSchema>;

const policyNotice =
  "Replace this text with the store's actual policy before accepting orders. This default is a placeholder and is not legal advice or a verified legal document.";

export const defaultStoreSettings: StoreSettingsData = {
  announcement: { enabled: false, text: "", href: "" },
  hero: {
    title: "Elegance Woven for You.",
    subtitle: "Discover sarees that make every occasion memorable.",
    desktopImage: { url: "", alt: "" },
    mobileImage: { url: "", alt: "" },
    primaryCtaLabel: "Shop Collection",
    primaryCtaHref: "/collections/sarees",
    secondaryCtaLabel: "Explore New Arrivals",
    secondaryCtaHref: "/collections/new-arrivals",
  },
  sections: {
    categories: true,
    bestSellers: true,
    newArrivals: true,
    featured: true,
    brandStory: true,
    whyShop: true,
    policies: true,
  },
  categoryCards: [
    { title: "Silk Sarees", href: "/collections/silk-sarees", image: { url: "", alt: "Silk sarees" } },
    { title: "Everyday Wear", href: "/collections/everyday-wear", image: { url: "", alt: "Everyday wear" } },
    { title: "Festive Wear", href: "/collections/festive-wear", image: { url: "", alt: "Festive wear" } },
    { title: "New Arrivals", href: "/collections/new-arrivals", image: { url: "", alt: "New arrivals" } },
  ],
  featuredCollectionSlugs: ["festive-wear", "silk-sarees"],
  brandStory: {
    title: "A quieter kind of luxury",
    body: "THE VELORA is a premium Indian saree and ethnic-wear house. The edit is for women who want elegance that feels current: silk for celebrations, and easier drapes for the days in between.",
    image: { url: "", alt: "" },
  },
  whyShop: [
    { title: "Fabric, colour, and care", body: "Each listing shows the details entered for that saree, so you can compare fabric and care before you buy." },
    { title: "Server-calculated prices", body: "Checkout uses the current catalogue price, shipping rule, and coupon. The browser total is never the amount charged." },
    { title: "Delivery rules you can read", body: "Shipping charges and PIN-code rules come from the store settings, and a PIN match is not a courier guarantee." },
    { title: "A person checks UPI payments", body: "Manual UPI orders stay awaiting verification until an administrator confirms the transfer in the merchant account." },
  ],
  contact: { email: "", phone: "", address: "" },
  social: {
    instagram: "https://www.instagram.com/the_veloraa.in/",
    facebook: "https://www.facebook.com/profile.php?id=61595954965283",
    pinterest: "",
  },
  footerLinks: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/policies/privacy" },
    { label: "Returns", href: "/policies/returns" },
    { label: "Terms", href: "/policies/terms" },
  ],
  policies: {
    privacy: `${policyNotice}\n\nTHE VELORA collects the name, mobile number, delivery address, and optional email needed to fulfil an order. Payment references submitted for manual UPI review are stored for reconciliation. The store does not ask for UPI PINs, OTPs, or card numbers.`,
    returns: `${policyNotice}\n\nDescribe the return window, eligible conditions, and items that cannot be returned. Until this text is replaced, contact the store before assuming a return is available.`,
    terms: `${policyNotice}\n\nOrders are offers to purchase. A UPI payment attempt does not complete the order until the store verifies the transfer. Prices are in INR and are confirmed on the server when the order is created.`,
  },
  shipping: {
    flatRatePaise: 9900,
    freeShippingThresholdPaise: 249900,
    serviceablePinPrefixes: [],
    blockedPinPrefixes: [],
    deliveryNote: "Shipping is calculated from the store's current fee and free-shipping threshold. PIN-code checks use the configured allow and block lists only.",
  },
  payment: {
    merchantUpiId: "",
    merchantName: "THE VELORA",
    instructions:
      "Pay the exact amount to the merchant UPI ID, then submit the UTR or reference number. The order stays awaiting payment until an administrator confirms the transfer in the merchant account. A payment app redirect, screenshot, or reference number is not itself proof of receipt.",
  },
  tax: {
    rateBps: 0,
    pricesIncludeTax: true,
    note: "Tax settings are store configuration and are not a legal determination of GST liability.",
  },
  seo: {
    title: "THE VELORA",
    description: "Elegance Woven for You. Premium Indian sarees and ethnic wear.",
  },
};
