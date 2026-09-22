# Contributing to Vendure Multi-Market Plugin

Thank you for your interest in contributing to the **Multi-Market Vendure Plugin**!

---

## Architecture Principles

1. **Zero Hardcoding**:
   - Never introduce hardcoded markets, countries, currencies, languages, or channels into code.
   - All markets must be data-driven and configurable via database/Admin API.
2. **Global Store is a Peer Market**:
   - The Global market (`/` with empty URL prefix or `/global`) is an authentic storefront, not a blind redirect.
3. **No Campaign Logic**:
   - Keep the multi-market plugin focused on market identity, routing, channel mapping, merchandising, navigation, and SEO. Campaign scheduling belongs in a separate dedicated plugin.
4. **Vendure Native**:
   - Vendure Channels remain the ultimate authority for commerce data (prices, stock, orders, taxes).

---

## Development Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run tests**:
   ```bash
   pnpm --filter server test:multi-market
   ```

3. **Build plugin and server**:
   ```bash
   pnpm --filter server build:server
   ```

---

## Submitting Pull Requests

1. Create a feature branch from `main`.
2. Ensure all unit tests pass (`pnpm --filter server test:multi-market`).
3. Verify TypeScript builds without errors (`pnpm --filter server build:server`).
4. Include clear commit messages describing your change.
