# Privacy information

Last updated: August 16, 2026

FindIP Shield for Shopify is designed to minimize storefront data collection.

## Data processed

- Visitor IP address as observed by the FindIP Shield ingest server
- Shopify standard event name and timestamp
- Page origin and path, with query string and fragment removed
- Page title and referrer
- Browser user agent, language preferences, cookie availability, and viewport size
- Random identifier limited to the current browser session
- Store domain and app authentication session required to operate the installation

## Data not transmitted by the integration

- Names, email addresses, phone numbers, or postal addresses
- Shopify customer, order, checkout, product, or variant identifiers
- Cart contents, product titles, SKUs, or search queries
- Payment or card information
- Form contents, keystrokes, or page DOM content

## Consent

The Web Pixel extension declares analytics processing to Shopify. Shopify controls execution based on the merchant's Customer Privacy configuration and the visitor's consent state where applicable.

## Shopify privacy requests

The app implements Shopify's `customers/data_request`, `customers/redact`, and `shop/redact` compliance webhooks. The app does not persist Shopify customer or order records. Shop authentication sessions are removed on uninstall and shop redaction.

For privacy requests, contact [info@findip.net](mailto:info@findip.net). The governing FindIP privacy policy is available at [findip.net/privacy](https://findip.net/privacy).
