# Multi-Market Vendure Plugin

A reusable, production-grade **Multi-Market Plugin for Vendure** that enables a single Vendure commerce backend to power multiple regional and global storefronts without microservices, duplicate databases, or hardcoded country branching.

---

## 1. What the Plugin Does

The **Multi-Market Plugin** adds a clean market abstraction layer to Vendure:

- Operates unlimited country/regional storefronts (e.g. Global `/`, India `/in/`, Bangladesh `/bd/`, UAE `/ae/`, USA `/us/`).
- Dynamically maps each market to a configured **Vendure Channel** and automatically resolves `channelToken`.
- Multi-country regional clusters (`supportedCountryCodes`, e.g. Middle East cluster `["AE", "SA", "QA", "KW", "OM", "BH"]`).
- Stores market-specific configurations: navigation trees, homepage sections, merchandising rules, and SEO metadata.
- Evaluates active market resolution using a strict 5-tier deterministic hierarchy with country cluster matching.
- Provides non-intrusive Geo-IP recommendations for soft suggestion banners.
- Emits `MarketEvent` on all CRUD mutations to trigger automated storefront cache invalidation (`/api/revalidate?tag=markets`).
- Developer DX: Geo-IP simulation via `x-mock-country` / `x-suisuto-mock-country` headers.
- Includes a React-based **Vendure v3 Admin Dashboard** extension with live URL preview, channel selector dropdown, and country cluster configuration.

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
import { MultiMarketPlugin } from "./plugins/multi-market/multi-market.plugin";

export const config: VendureConfig = {
  // ...
  plugins: [
    // ...
    MultiMarketPlugin.init({
      defaultMarketCode: "global",
      cacheTtlMs: 60_000, // 1 minute in-memory cache
      storefrontRevalidateUrl: process.env.STOREFRONT_URL
        ? `${process.env.STOREFRONT_URL}/api/revalidate`
        : "http://localhost:3001/api/revalidate",
      revalidateSecret:
        process.env.REVALIDATION_SECRET || "dev-revalidate-secret",
    }),
  ],
};
```

Run database migrations to generate the `market` table and cluster columns:

```bash
npx vendure migrate -r
```

---

## 4. Configuration Options

`MultiMarketPlugin.init(options)` accepts:

| Option                    | Type          | Default                                   | Description                                       |
| ------------------------- | ------------- | ----------------------------------------- | ------------------------------------------------- |
| `defaultMarketCode`       | `string`      | `'global'`                                | Code of the fallback market when no rule matches  |
| `cacheTtlMs`              | `number`      | `60000`                                   | In-memory market configuration cache TTL (ms)     |
| `geoHeaderKeys`           | `string[]`    | `['cf-ipcountry', 'x-mock-country', ...]` | Request headers checked for Geo-IP                |
| `geoProvider`             | `GeoProvider` | `HeaderGeoProvider`                       | Custom geolocation provider implementation        |
| `storefrontRevalidateUrl` | `string`      | optional                                  | Storefront webhook URL to purge cache on changes  |
| `revalidateSecret`        | `string`      | optional                                  | Shared secret for storefront revalidation webhook |

---

## 5. Creating Markets & Country Clusters

Markets can be created via the **Vendure Admin Dashboard** (`/dashboard/markets`) or via the **GraphQL Admin API**:

```graphql
mutation CreateNewMarket {
  createMarket(
    input: {
      code: "me"
      name: "Middle East Cluster"
      countryCode: "AE"
      supportedCountryCodes: ["AE", "SA", "QA", "KW", "OM", "BH"]
      currency: "AED"
      defaultLanguage: "en"
      supportedLanguages: ["en", "ar"]
      urlPrefix: "me"
      channelCode: "me-channel"
      enabled: true
      isDefault: false
      seo: {
        siteTitle: "Suisuto Middle East — Atelier"
        titleTemplate: "%s | Suisuto Middle East"
        defaultMetaDescription: "Luxury handwoven silk textiles delivered across GCC."
      }
    }
  ) {
    id
    code
    name
    channelToken
    supportedCountryCodes
  }
}
```

### Invariant Safeguards

- **Default Market Protection**: The system prevents deleting or deactivating the active default market.
- **Channel Validation**: On creation/update, the plugin verifies that the specified `channelCode` exists in Vendure and checks for currency & language compatibility.

---

## 6. Mapping Markets to Vendure Channels & Tokens

Each market maps to a `channelCode` and automatically resolves the channel's `channelToken`:

```text
Market Code     URL Prefix      Vendure Channel       Channel Token
-----------     ----------      ---------------       -------------
global          "" (root /)     __default_channel__   (resolved token)
in              "in" (/in/)     in-channel            (resolved token)
bd              "bd" (/bd/)     bd-channel            (resolved token)
me              "me" (/me/)     me-channel            (resolved token)
```

The resolved `channelToken` is exposed in `resolveMarket` and `activeMarket` GraphQL queries, allowing storefronts to set the `vendure-token` request header without extra channel lookup calls.

---

## 7. Market Resolution (5-Tier Priority)

The plugin resolves active markets deterministically:

1. **Explicit Market in URL** (e.g. `/in/products/shoes` -> `in`, `/` -> `global`) — **Always wins**.
2. **Explicit User Selection** (e.g. user manually switches from language/region selector).
3. **Persisted Preference** (e.g. saved cookie or user profile setting).
4. **Geo-IP Recommendation**:
   - Matches primary `countryCode` (e.g. `IN` -> `in`).
   - Falls back to multi-country cluster matching `supportedCountryCodes` (e.g. `SA` or `QA` matches `me` market).
5. **Global Fallback** (`isDefault: true` market, e.g. `global`).

> **Security & UX Rule**: Geo-IP _never_ silently overrides an explicit URL. A user on `/in/` with an IP from Saudi Arabia remains on the India market.

---

## 8. Developer Geo Simulation

Simulate any visitor country in development or staging without a VPN by passing custom request headers:

- `x-mock-country: AE`
- `x-suisuto-mock-country: SA`

These headers take precedence in development and allow testing regional routing, soft suggestion banners, and currency adaptations instantly.

---

## 9. Market Switching

The plugin calculates target URLs preserving deep routes with automated fallback:

```graphql
query SwitchMarket {
  switchMarket(
    currentUrl: "/in/products/handwoven-saree"
    targetMarketCode: "bd"
  ) {
    targetMarketCode
    targetUrl # Returns "/bd/products/handwoven-saree"
    matchedRoute
  }
}
```

Switching to Global (`urlPrefix: ""`):

- `/bd/products/handwoven-saree` -> `/products/handwoven-saree`

---

## 10. Geo Recommendations

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

The frontend displays:

> _"We noticed you are visiting from Saudi Arabia. [Shop Middle East] [Continue to Global]"_

---

## 11. EventBus & Storefront Cache Invalidation

When a market is created, updated, or deleted, `MarketService` fires a `MarketEvent`:

1. Purges the in-memory market cache.
2. If `storefrontRevalidateUrl` is configured, sends an HTTP POST webhook with `tag: "markets"` and `x-revalidate-secret`.
3. The TanStack Start storefront invalidates its regional market cache in real time.

---

## 12. Admin UI Dashboard

The plugin registers a route `/markets` in Vendure v3's modern React dashboard:

- Tabular market overview with status, currency, channel badge, and token display.
- **Channel Selector Dropdown**: Live queried channels from Vendure core with tokens displayed.
- **Country Clusters**: Input multi-country ISO codes (e.g. `AE, SA, QA, KW, OM, BH`).
- **Live URL Preview**: Interactive preview box showing `/` for global or `/{urlPrefix}/...` for regional markets.
- JSON editors for Navigation, Homepage sections, Merchandising, and SEO.
- One-click "Seed Default Markets" for rapid onboarding.

---

## 13. Testing

Run the automated test suite verifying resolution hierarchy, URL handling, country clusters, safeguards, channel resolution, dev simulation headers, and zero-hardcoding extensibility:

```bash
pnpm --filter server test:multi-market
```

---

## 14. Extending the Plugin

### Custom GeoProvider

Implement `GeoProvider` to integrate MaxMind GeoIP2, AWS CloudFront headers, or external APIs:

```ts
import { GeoProvider } from "./types/market.types";

export class CustomMaxMindProvider implements GeoProvider {
  async getCountry(request: unknown): Promise<string | null> {
    // Custom lookup logic
    return "AE";
  }
}

// In vendure-config.ts:
MultiMarketPlugin.init({
  geoProvider: new CustomMaxMindProvider(),
});
```

---

## License

MIT © [Suisuto](https://github.com/suisuto)
