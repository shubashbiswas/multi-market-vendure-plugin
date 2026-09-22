# Multi-Market Architecture Specification

## Overview

The Multi-Market Plugin introduces a lightweight, data-driven market layer sitting between the storefront applications and Vendure's Channel infrastructure.

```text
                  Incoming Request
                         │
                         ▼
             Market Resolution Pipeline
         (URL > Selection > Cookie > Geo > Fallback)
                         │
                         ▼
                   Active Market
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
Storefront Content   Channel Code     Currency / Lang
(Navigation, Hero,   (Vendure Channel (Localized Experience)
 Merchandising, SEO)  Catalog Scope)
```

## Core Architectural Invariants

1. **Single Database & Instance**:
   All markets operate within one Vendure deployment and one database. Multi-tenancy is realized cleanly via Vendure Channels and the `Market` entity.

2. **Zero Hardcoded Logic**:
   The plugin does not contain switch statements or conditionals branching on country names (`if (market === 'in')`). All market behavior is read from configured attributes on the `Market` entity.

3. **Global Market is a Peer**:
   The Global storefront (`/` with empty prefix) is a full market with its own catalog scope (`__default_channel__`), navigation, and merchandising. It is not an empty redirect to a country.

4. **Deterministic Priority**:
   - Explicit URL path always takes precedence over Geo-IP and cookies.
   - Geo-IP is strictly used for recommendation suggestions unless explicitly configured otherwise.
