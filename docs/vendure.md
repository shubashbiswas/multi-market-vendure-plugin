# Vendure Channels & Database Specification

## Vendure Channels Role

Vendure's Channel abstraction serves as the multi-tenancy engine for ecommerce data:

- **Products**: Can be shared across all channels or assigned selectively.
- **Product Variants**: Maintain independent prices and tax rates per channel.
- **Stock Locations**: Channels can source inventory from specific warehouses or global hubs.
- **Shipping & Payment**: Channels restrict payment methods (e.g. Razorpay for India, SSLCOMMERZ for Bangladesh, Stripe for Global) and courier options.

## Channel Resolution Workflow

```text
Storefront Request (URL /in/...)
       ↓
MultiMarketPlugin resolves channelCode: "in-channel"
       ↓
Storefront passes "vendure-token: in-channel"
       ↓
Vendure ChannelInterceptor scopes RequestContext to Channel
       ↓
Vendure returns India-specific prices, currencies, and products
```

## Database Migrations

The plugin manages its schema via standard TypeORM migrations in `apps/server/src/migrations/`.

Run migrations:
```bash
cd apps/server
npx vendure migrate -r
```
