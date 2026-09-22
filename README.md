# Multi-Market Vendure Plugin

A reusable, production-grade **Multi-Market Plugin for Vendure** that enables a single Vendure commerce backend to power multiple regional and global storefronts without microservices, duplicate databases, or hardcoded country branching.

---

## 1. What the Plugin Does

The **Multi-Market Plugin** adds a clean market abstraction layer to Vendure:
- Operates unlimited country/regional storefronts (e.g. Global `/`, India `/in/`, Bangladesh `/bd/`, UAE `/ae/`, USA `/us/`).
- Dynamically maps each market to a configured **Vendure Channel**.
- Stores market-specific configurations: navigation trees, homepage sections, merchandising rules, and SEO metadata.
- Evaluates active market resolution using a strict 5-tier deterministic hierarchy.
- Provides non-intrusive Geo-IP recommendations for soft suggestion banners.
- Includes a React-based **Vendure v3 Admin Dashboard** extension for point-and-click market management.

---

## 2. Why It Exists

Standard international ecommerce often suffers from two bad extremes:
1. **Microservice Overkill**: Spawning separate backend servers, databases, or API gateways for each country.
2. **Hardcoded Spaghetti**: Writing `if (market === 'in')` throughout frontend and backend templates.

This plugin adheres to the golden rule:
> **One Vendure installation, one database, multiple configurable markets.**
> Nothing country-specific is ever hardcoded into business logic.

---

## 3. Installation

Add the plugin to your Vendure server:

```bash
# If installed from npm in the future:
pnpm add @suisuto/vendure-plugin-multi-market
```

Or reference it directly from your plugins directory:

```ts
// vendure-config.ts
import { MultiMarketPlugin } from './plugins/multi-market/multi-market.plugin';

export const config: VendureConfig = {
    // ...
    plugins: [
        // ...
        MultiMarketPlugin.init({
            defaultMarketCode: 'global',
            cacheTtlMs: 60_000, // 1 minute in-memory cache
        }),
    ],
};
```

Run database migrations to generate the `market` table:
```bash
npx vendure migrate -r
```

---

## 4. Configuration Options

`MultiMarketPlugin.init(options)` accepts:

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultMarketCode` | `string` | `'global'` | Code of the fallback market when no rule matches |
| `cacheTtlMs` | `number` | `60000` | In-memory market configuration cache TTL (ms) |
| `geoHeaderKeys` | `string[]` | `['cf-ipcountry', 'x-country-code', ...]` | Request headers checked for Geo-IP |
| `geoProvider` | `GeoProvider` | `HeaderGeoProvider` | Custom geolocation provider implementation |

---

## 5. Creating Markets

Markets can be created via the **Vendure Admin Dashboard** (`/dashboard/markets`) or via the **GraphQL Admin API**:

```graphql
mutation CreateNewMarket {
  createMarket(input: {
    code: "ae"
    name: "United Arab Emirates"
    countryCode: "AE"
    currency: "AED"
    defaultLanguage: "en"
    supportedLanguages: ["en", "ar"]
    urlPrefix: "ae"
    channelCode: "ae-channel"
    enabled: true
    isDefault: false
    seo: {
      siteTitle: "Suisuto UAE — Dubai Luxury Atelier"
      titleTemplate: "%s | Suisuto UAE"
      defaultMetaDescription: "Luxury handwoven silk textiles delivered across UAE."
    }
  }) {
    id
    code
    name
  }
}
```

---

## 6. Mapping Markets to Vendure Channels

Each market specifies a `channelCode`. During storefront queries, the storefront passes the corresponding channel token in the `vendure-token` header:

```text
Market Code     URL Prefix      Vendure Channel
-----------     ----------      ---------------
global          "" (root /)     __default_channel__
in              "in" (/in/)     in-channel
bd              "bd" (/bd/)     bd-channel
ae              "ae" (/ae/)     ae-channel
```

Vendure natively isolates catalog pricing, stock levels, payment methods, and shipping options per Channel.

---

## 7. Market Resolution (5-Tier Priority)

The plugin resolves active markets deterministically:

1. **Explicit Market in URL** (e.g. `/in/products/shoes` -> `in`, `/` -> `global`) — **Always wins**.
2. **Explicit User Selection** (e.g. user manually switches from language/region selector).
3. **Persisted Preference** (e.g. saved cookie or user profile setting).
4. **Geo-IP Recommendation** (matches detected country to market `countryCode`).
5. **Global Fallback** (`isDefault: true` market, e.g. `global`).

> **Security & UX Rule**: Geo-IP *never* silently overrides an explicit URL. A user on `/in/` with an IP from Bangladesh remains on the India market.

---

## 8. Market Switching

The plugin calculates target URLs preserving deep routes with automated fallback:

```graphql
query SwitchMarket {
  switchMarket(currentUrl: "/in/products/handwoven-saree", targetMarketCode: "bd") {
    targetMarketCode
    targetUrl         # Returns "/bd/products/handwoven-saree"
    matchedRoute
  }
}
```

Switching to Global (`urlPrefix: ""`):
- `/bd/products/handwoven-saree` -> `/products/handwoven-saree`

---

## 9. Geo Recommendations

To offer soft suggestion banners without jarring redirects:

```graphql
query GetGeoRecommendation {
  marketRecommendation(currentMarketCode: "global") {
    recommendedMarketCode
    countryCode
    isRecommendedDifferentFromCurrent
    reason
  }
}
```

The frontend can show:
> *"We noticed you are visiting from India. [Shop India] [Continue to Global]"*

---

## 10. Admin UI Dashboard

The plugin registers a route `/markets` in Vendure v3's modern React dashboard:
- Tabular market overview with status, currency, and channel tags.
- Create and edit modal with full JSON editors for Navigation, Homepage sections, Merchandising, and SEO.
- One-click "Seed Default Markets" for rapid onboarding.

---

## 11. Testing

Run the automated test suite verifying resolution hierarchy, URL handling, switching, and zero-hardcoding extensibility:

```bash
pnpm --filter server test:multi-market
```

---

## 12. Extending the Plugin

### Custom GeoProvider
Implement `GeoProvider` to integrate MaxMind GeoIP2, AWS CloudFront headers, or external APIs:

```ts
import { GeoProvider } from './types/market.types';

export class CustomMaxMindProvider implements GeoProvider {
    async getCountry(request: unknown): Promise<string | null> {
        // Custom lookup logic
        return 'AE';
    }
}

// In vendure-config.ts:
MultiMarketPlugin.init({
    geoProvider: new CustomMaxMindProvider(),
})
```

---

## License

MIT © [Suisuto](https://github.com/suisuto)
