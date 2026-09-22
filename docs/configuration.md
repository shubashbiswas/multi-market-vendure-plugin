# Market Configuration & Content Schema

The plugin allows each market to store customized navigation trees, homepage layouts, merchandising preferences, and SEO metadata.

---

## 1. Navigation Schema

```json
{
  "primary": [
    { "id": "nav-1", "label": "Varanasi Atelier", "href": "/in/collections/varanasi" },
    { "id": "nav-2", "label": "Heritage Weaves", "href": "/in/collections/heritage" }
  ],
  "footer": {
    "columns": [
      {
        "title": "Boutique Services",
        "items": [
          { "id": "ft-1", "label": "Custom Blouse Tailoring", "href": "/in/custom-tailoring" }
        ]
      }
    ],
    "copyright": "© 2026 Suisuto India. Handcrafted Heritage."
  }
}
```

---

## 2. Homepage Schema

```json
{
  "hero": {
    "headline": "Varanasi Silk Excellence",
    "subHeadline": "Hand-spun mulberry silk woven by master artisans.",
    "ctaLabel": "Explore Collection",
    "ctaHref": "/in/collections/varanasi",
    "assetUrl": "https://assets.example.com/in-hero.webp",
    "badge": "Handloom Mark Certified"
  },
  "sections": [
    { "type": "hero", "props": { "variant": "split" } },
    { "type": "featured-collection", "props": { "collectionSlug": "varanasi-silks" } },
    { "type": "artisan-story", "props": { "artisanId": "varanasi-loom-collective" } }
  ]
}
```

---

## 3. Merchandising Schema

```json
{
  "featuredCollectionSlugs": ["varanasi-silks", "bridal-trousseau"],
  "featuredProductIds": ["42", "108"],
  "productOrderPreference": "featured"
}
```

---

## 4. SEO Schema

```json
{
  "siteTitle": "Suisuto India — Artisanal Handloom Luxury",
  "titleTemplate": "%s | Suisuto India",
  "defaultMetaDescription": "Authentic Varanasi silk sarees, lehengas, and handspun shawls.",
  "ogImageUrl": "https://assets.example.com/in-og.webp",
  "hreflangMapping": {
    "en": "https://suisuto.com/in/",
    "hi": "https://suisuto.com/in/"
  }
}
```
