# Multi-Market Vendure Plugin

## Objective

Build a reusable, production-ready **Multi-Market Plugin for Vendure** that allows a single Vendure installation to operate multiple country/market storefronts from one commerce backend.

The plugin should be designed as a clean, modular Vendure plugin that can be published to GitHub and reused across multiple projects.

The architecture must remain simple.

**Do not build a separate multi-market server, microservice, API gateway, or separate database.**

The Multi-Market system should run as part of the existing Vendure installation.

---

# 1. Core Architecture

The architecture should be:

```text
                    Vendure
                       │
              MultiMarketPlugin
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
    Markets       Configuration     Market APIs
       │
       ▼
   Vendure Channels
       │
       ├── Global
       ├── India
       ├── Bangladesh
       ├── UAE
       └── USA
                       │
                       ▼
                  Storefront
```

There should be:

- One Vendure installation
- One Vendure database
- One commerce backend
- Multiple Vendure Channels
- One MultiMarketPlugin
- One or more frontend applications

The plugin provides the market abstraction and configuration layer.

---

# 2. Vendure Plugin Location

The plugin should live inside the Vendure project:

```text
src/
└── vendure/
    └── plugins/
        └── multi-market/
            ├── multi-market.plugin.ts
            ├── entities/
            ├── services/
            ├── resolvers/
            ├── api/
            ├── admin-ui/
            ├── types/
            └── constants/
```

The implementation should follow standard Vendure plugin architecture.

The plugin should be independently understandable and modular so it can later be extracted into a standalone npm package if desired.

---

# 3. Multi-Market Concept

A **market** represents a storefront/business market.

Example:

```text
Global
India
Bangladesh
UAE
USA
```

A market should not be hard-coded into application logic.

Markets must be represented as configuration/data.

Example:

```ts
interface Market {
  id: string;
  code: string;
  name: string;

  country?: string;

  currency: string;

  defaultLanguage: string;

  urlPrefix: string;

  channelCode: string;

  enabled: boolean;
}
```

The exact model may be adapted to Vendure conventions.

---

# 4. Vendure Channel Mapping

Each market should map to a Vendure Channel.

Example:

```text
Market              Vendure Channel

global              Global Channel
in                  India Channel
bd                  Bangladesh Channel
ae                  UAE Channel
us                  USA Channel
```

The mapping must be configurable.

Do not write code such as:

```ts
if (market === 'in') {
  channel = indiaChannel;
}
```

Instead:

```text
Market
   ↓
Configured Channel
   ↓
Vendure
```

The plugin should resolve the Channel dynamically from market configuration.

---

# 5. Global Market

The Global storefront is a real market.

It must not simply redirect to another country.

Example:

```text
/
```

represents:

```text
Global Market
```

while:

```text
/in/
```

represents:

```text
India Market
```

and:

```text
/bd/
```

represents:

```text
Bangladesh Market
```

---

# 6. URL Structure

The default URL structure should support:

```text
/          → Global
/in/       → India
/bd/       → Bangladesh
/ae/       → UAE
/us/       → USA
```

However, the system must **not assume these exact markets**.

A project should be able to configure:

```text
/india/
/bangladesh/
/middle-east/
/usa/
```

or any other valid market prefix.

The URL prefix must therefore be configuration-driven.

---

# 7. Market Resolution

Market resolution should follow this priority:

```text
1. Explicit market in URL
2. Explicit user market selection
3. Persisted user preference
4. Geo-IP recommendation
5. Global market fallback
```

Explicit URL selection always wins.

For example:

```text
/in/products/shoes
```

must always resolve to:

```text
India
```

even if the visitor's IP address appears to be from Bangladesh.

Geo-IP must never silently override an explicit market URL.

---

# 8. Geo-IP

Geo-IP detection should be optional.

The plugin should not depend on a specific geo-IP provider.

Instead, define a simple provider interface:

```ts
interface GeoProvider {
  getCountry(request: unknown): Promise<string | null>;
}
```

The system may then use the detected country to recommend a market.

Example:

```text
We noticed you're visiting from India.

[Shop India] [Continue to Global]
```

Geo detection should be treated as a recommendation mechanism, not as the authoritative market selection mechanism.

---

# 9. Market Switching

The plugin should provide utilities/API functionality for switching markets.

Example:

```text
/in/products/shoes
```

Switching to Bangladesh should attempt:

```text
/bd/products/shoes
```

If the equivalent route/content does not exist:

```text
/bd/
```

should be used as the fallback.

The market system should expose enough information for the frontend to implement this behavior cleanly.

---

# 10. Market Configuration

Market-specific storefront configuration should be data-driven.

A market may contain configuration for:

```text
Market
├── identity
├── URL
├── currency
├── language
├── Vendure Channel
├── navigation
├── homepage
├── merchandising
├── content
└── SEO
```

Example:

```ts
interface MarketConfig {
  market: Market;

  navigation?: NavigationConfig;

  homepage?: HomepageConfig;

  merchandising?: MerchandisingConfig;

  content?: ContentConfig;

  seo?: SeoConfig;
}
```

---

# 11. Homepage Configuration

Each market should be able to have its own homepage configuration.

For example:

```text
Global
├── Hero
├── Featured Products
├── Categories
└── Editorial

India
├── Hero
├── India Collections
├── Featured Products
└── Editorial

Bangladesh
├── Hero
├── Bangladesh Collections
├── Featured Products
└── Editorial
```

Do not create separate frontend components such as:

```text
IndiaHomepage
BangladeshHomepage
UAEHomepage
```

Instead, the frontend should render reusable sections based on configuration.

Example:

```ts
type HomepageSection =
  | HeroSection
  | BannerSection
  | ProductCollectionSection
  | CategoryGridSection
  | EditorialSection
  | CustomSection;
```

---

# 12. Navigation

Navigation must be market-specific and data-driven.

Example:

```text
Global
├── Store
├── Mac
├── iPhone
└── Accessories
```

Another market may have completely different navigation.

The frontend should retrieve navigation from the market configuration rather than hard-code country-specific navigation.

---

# 13. Merchandising

Markets must be able to configure merchandising independently.

This may include:

- Featured products
- Featured collections
- Product ordering
- Category ordering
- Market-specific product visibility
- Market-specific homepage product sections

Vendure remains the authority for actual commerce data.

The plugin should not duplicate the product catalog unnecessarily.

---

# 14. Product Catalog

Products should remain in Vendure.

Do not create duplicate products simply because a product is sold in multiple markets.

Use Vendure's existing Channel functionality for market-specific commerce behavior.

The architecture should support:

```text
One Product
     │
     ├── Global Channel
     ├── India Channel
     ├── Bangladesh Channel
     └── UAE Channel
```

Where appropriate, Vendure controls:

- Product availability
- Variants
- Prices
- Inventory
- Orders
- Customers
- Taxes
- Shipping
- Payments
- Promotions
- Channels

The MultiMarketPlugin should complement Vendure rather than replace Vendure's commerce responsibilities.

---

# 15. Language and Market

Language and market must remain separate concepts.

Do not assume:

```text
India = English
Bangladesh = Bengali
```

A market may support one or more languages independently.

Initially, language does not need to appear in the URL.

For example:

```text
/in/
```

can have English or another configured language.

The architecture should remain extensible so language-specific URLs can be introduced later if required for SEO.

---

# 16. API

The plugin should expose a clean API for frontend applications.

For example:

```text
GET /markets

GET /markets/:market

GET /markets/:market/config

GET /markets/:market/navigation

GET /markets/:market/homepage

GET /market/recommendation
```

The exact REST or GraphQL implementation should follow Vendure conventions.

Where appropriate, prefer Vendure's native API mechanisms rather than introducing an unnecessary separate API server.

---

# 17. Frontend Independence

The plugin must not contain framework-specific storefront code.

Do not put:

```text
React components
Next.js routes
TanStack routes
Vue components
Svelte components
```

inside the core Vendure plugin.

The plugin should expose stable APIs/data that any frontend can consume.

It should work with:

```text
TanStack Start
Next.js
Nuxt
SvelteKit
Remix
React
Vue
Svelte
Angular
```

The frontend owns:

- Rendering
- Routing
- UI
- Components
- Client-side state
- Browser interaction

The Vendure plugin owns:

- Market data
- Market configuration
- Market resolution support
- Channel mapping
- Market APIs
- Administrative configuration

---

# 18. Admin UI

If practical, provide a Vendure Admin UI for managing markets.

Administrators should be able to:

- Create markets
- Edit markets
- Enable/disable markets
- Configure URL prefixes
- Assign Vendure Channels
- Configure currency
- Configure default language
- Configure navigation
- Configure homepage sections
- Configure SEO metadata
- Configure market-specific merchandising

The goal is to avoid requiring developers to modify source code whenever a new market is added.

---

# 19. Adding a New Market

Adding a new market should ideally look like:

```text
Create Market
      ↓
Configure URL prefix
      ↓
Assign Vendure Channel
      ↓
Configure market settings
      ↓
Configure storefront content
      ↓
Enable Market
```

It should **not** require adding new application logic.

Avoid:

```ts
if (market === 'india') {}
if (market === 'bangladesh') {}
if (market === 'uae') {}
```

Avoid:

```text
IndiaHomepage
BangladeshHomepage
UAEHomepage
```

The system must be configuration-driven.

---

# 20. No Hard-Coded Country Logic

This is one of the most important architectural requirements.

Do not hard-code:

```text
India
Bangladesh
UAE
USA
IN
BD
AE
US
INR
BDT
AED
USD
```

into business logic.

These should exist only as example configuration/data where necessary.

The plugin must support completely different markets without modifying its business logic.

For example:

```text
Market A
Market B
Market C
```

should work just as well as:

```text
India
Bangladesh
UAE
```

---

# 21. No Campaign System

Do not implement a campaign management system.

Do not add:

```text
Campaign entity
Campaign scheduler
Campaign rules
Campaign landing pages
Campaign targeting
Campaign activation
Campaign priority
```

Market-specific merchandising and homepage configuration are sufficient for this system.

---

# 22. Repository Structure

Keep the repository simple and GitHub-ready.

Suggested structure:

```text
src/
├── vendure/
│   ├── plugins/
│   │   └── multi-market/
│   │       ├── multi-market.plugin.ts
│   │       ├── entities/
│   │       ├── services/
│   │       ├── resolvers/
│   │       ├── api/
│   │       ├── admin-ui/
│   │       ├── types/
│   │       └── constants/
│   │
│   └── config/
│
├── storefront/
│   └── ...
│
tests/
│
docs/
│   ├── architecture.md
│   ├── markets.md
│   ├── configuration.md
│   ├── frontend-integration.md
│   └── vendure.md
│
.env.example
README.md
LICENSE
CONTRIBUTING.md
package.json
```

Do not create unnecessary packages or services unless there is a concrete requirement for them.

---

# 23. Reusability

The project should be structured so the MultiMarketPlugin can later be extracted into a reusable npm package.

Potential future package:

```text
@your-org/vendure-plugin-multi-market
```

However, **do not prematurely create a complicated package ecosystem.**

First build a clean Vendure plugin.

If a component is genuinely framework-independent and reusable, it can later be extracted.

---

# 24. Security

The plugin must not expose sensitive Vendure credentials to the frontend.

Do not trust frontend-provided market information for security-sensitive commerce decisions.

Market and Channel authorization must ultimately be validated server-side.

Validate:

- Market codes
- Market configuration
- Channel mappings
- API inputs
- Administrative changes

---

# 25. Performance

The implementation should avoid unnecessary requests.

Market resolution should happen once per request where possible.

Market configuration should support caching.

Avoid repeatedly querying:

```text
Market
Channel
Configuration
Navigation
Homepage
```

when the same information can be reused during a request.

---

# 26. Testing

Provide automated tests for:

### Market resolution

```text
URL market
User-selected market
Persisted preference
Geo recommendation
Global fallback
```

### URL handling

```text
/
/in/
/bd/
/ae/
/us/
```

including configurable prefixes.

### Market switching

```text
/in/products/shoes
→
/bd/products/shoes
```

and fallback behavior.

### Channel mapping

```text
Market → Vendure Channel
```

### Configuration

Verify that different markets can have different:

- Navigation
- Homepage
- Merchandising
- SEO
- Content

### Extensibility

Test that adding a completely new market does not require changing market-specific business logic.

---

# 27. GitHub Quality

The repository should be suitable for public GitHub publication.

Include:

```text
README.md
LICENSE
CONTRIBUTING.md
.env.example
docs/
tests/
```

Do not commit:

```text
Secrets
API keys
Vendure credentials
Production database credentials
Private domains
```

Documentation should explain:

1. What the plugin does
2. Why it exists
3. Installation
4. Configuration
5. Creating markets
6. Mapping markets to Vendure Channels
7. Frontend integration
8. Market switching
9. Geo recommendations
10. Admin UI
11. Testing
12. Extending the plugin

---

# 28. Fundamental Architecture Rule

The architecture should follow this principle:

> **One Vendure installation, one commerce backend, multiple configurable markets, with the MultiMarketPlugin providing the market abstraction and configuration layer.**

Do not introduce infrastructure unless it solves a real requirement.

The system should be:

- Simple
- Modular
- Reusable
- Configuration-driven
- Vendure-native
- Frontend-independent
- GitHub-ready
- Easy to extend

Most importantly:

> **Nothing market-specific should be hard-coded into the plugin's business logic.**

Markets, URL prefixes, Channels, currencies, languages, navigation, merchandising, content, homepage configuration, and SEO must be data-driven.

The plugin should provide the reusable infrastructure; the actual market definitions belong to each project's configuration/data.