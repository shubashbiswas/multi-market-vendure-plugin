# Market Definition & Channel Mapping Guide

## Market Entity Schema

Each market is represented by a record in the `market` database table:

```ts
interface Market {
  code: string;               // Unique ID, e.g. "global", "in", "bd", "ae"
  name: string;               // Display name, e.g. "India", "Global Store"
  countryCode?: string;       // ISO 3166-1 alpha-2, e.g. "IN", "BD"
  currency: string;           // ISO 4217, e.g. "USD", "INR", "BDT"
  defaultLanguage: string;    // e.g. "en", "bn", "hi"
  supportedLanguages: string[]; // e.g. ["en", "hi"]
  urlPrefix: string;          // "" for root /, "in", "bd", "middle-east"
  channelCode: string;        // Vendure Channel code, e.g. "in-channel"
  enabled: boolean;           // Activation status
  isDefault: boolean;         // Designates the primary fallback market
}
```

## Adding a New Market Checklist

1. **Create the Vendure Channel**:
   Navigate to **Vendure Admin > Settings > Channels** and create a channel (e.g. `ae-channel` with currency `AED`).
2. **Assign Products to Channel**:
   Assign relevant products, shipping methods, and payment handlers to the new channel.
3. **Register Market**:
   In **Vendure Admin > Markets** (`/dashboard/markets`), click **Add Market**:
   - Code: `ae`
   - Name: `United Arab Emirates`
   - URL Prefix: `ae`
   - Channel Code: `ae-channel`
   - Currency: `AED`
   - Country Code: `AE`
4. **Configure Storefront Content**:
   Add market-specific navigation, homepage sections, and merchandising JSON.
5. **Enable Market**:
   Toggle the market to `Active`. It is now instantly resolvable on the storefront at `/ae/`.
