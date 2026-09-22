# Frontend Integration Guide

The Multi-Market Plugin is completely frontend-agnostic. It works seamlessly with **TanStack Start**, **Next.js**, **Remix**, **Nuxt**, or custom SPA frontends.

---

## 1. Routing Model

Frontends should adopt a paired or prefix-based route tree:

- **Root routes**: `/` (Global market with `urlPrefix: ""`)
- **Regional routes**: `/:market/` (e.g. `/in/`, `/bd/`, `/ae/`)

### Route Resolution Example (TanStack Start / Next.js)

```ts
// Extract market from path params
const region = params.region || ''; // '' maps to Global

// Fetch active market configuration
const activeMarket = await queryVendure(GetMarketByUrlPrefixQuery, { prefix: region });
```

---

## 2. Setting the Channel Header

When querying the Vendure Shop API for catalog, cart, and checkout operations, attach the resolved market's channel code:

```ts
const response = await fetch('http://localhost:3000/shop-api', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'vendure-token': activeMarket.channelCode, // Scopes query to market channel
    },
    body: JSON.stringify({ query, variables }),
});
```

---

## 3. Dynamic Homepage Rendering

Rather than hardcoding separate templates like `<IndiaHomepage />` and `<BangladeshHomepage />`, render reusable section components dynamically:

```tsx
export function MarketHomepage({ sections }) {
    return (
        <div>
            {sections.map((section, idx) => {
                switch (section.type) {
                    case 'hero':
                        return <HeroSection key={idx} {...section.props} />;
                    case 'featured-collection':
                        return <FeaturedCollectionSection key={idx} {...section.props} />;
                    case 'artisan-story':
                        return <ArtisanStorySection key={idx} {...section.props} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}
```

---

## 4. Market Switching UX

When a user selects another market from the navigation dropdown, query `switchMarket`:

```ts
const { switchMarket } = await queryVendure(SwitchMarketQuery, {
    currentUrl: window.location.pathname,
    targetMarketCode: 'bd',
});

// Navigate cleanly to the preserved route
router.navigate({ to: switchMarket.targetUrl });
```
