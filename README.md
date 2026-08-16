# FindIP Shield for Shopify

FindIP Shield adds consent-aware visitor network risk detection to Shopify storefronts. It uses Shopify's Web Pixels API to send privacy-minimized event metadata to FindIP Shield, where the visitor IP observed by FindIP's servers is evaluated for VPN, proxy, Tor, hosting, datacenter, and malicious-network signals.

## Privacy boundary

The integration does **not** transmit customer names, emails, phone numbers, postal addresses, Shopify customer IDs, order IDs, cart contents, search queries, or payment details. Page URLs are stripped of query strings and fragments. A random, session-only identifier connects events within one browser session.

The web pixel declares analytics processing to Shopify and is executed according to Shopify's Customer Privacy consent controls. See [PRIVACY.md](PRIVACY.md) for the complete data inventory.

## Merchant setup

1. Create a Shield site for the Shopify storefront in the [FindIP dashboard](https://findip.net/shield/sites/new).
2. Register the exact storefront domain on that Shield site.
3. Install the FindIP Shield Shopify app.
4. Open **Shield settings**, enter the public key beginning with `pub_`, and select **Connect Shield**.
5. Visit the storefront with analytics consent enabled and verify that an event appears in FindIP Shield.

## Local development

Requirements: Node.js 22 LTS, Shopify CLI, a Shopify Partner organization, and a development store.

```bash
npm install
npm run setup
shopify app dev
```

The local session database is SQLite. Use durable shared storage such as PostgreSQL before deploying more than one production instance.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
shopify app build --no-color
```

## Architecture

- React Router embedded merchant app
- Shopify Web Pixel extension in the strict sandbox
- Admin GraphQL `webPixelCreate` / `webPixelUpdate` configuration
- Mandatory Shopify privacy-compliance webhooks
- FindIP Shield ingest endpoint: `https://shield.findip.net/v1/shield/track`

## Support and security

- Support: [info@findip.net](mailto:info@findip.net)
- Security: [security@findip.net](mailto:security@findip.net)
- Responsible disclosure: [SECURITY.md](SECURITY.md)

Copyright © 2026 FindIP. Released under the [MIT License](LICENSE).
