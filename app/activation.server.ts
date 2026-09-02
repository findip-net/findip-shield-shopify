export type ShopifyActivationEvent =
  | "shopify_install_completed"
  | "shopify_app_opened"
  | "shopify_pixel_connected"
  | "shopify_connection_verified";

export async function reportShopifyActivation(input: {
  eventName: ShopifyActivationEvent;
  shopDomain: string;
  siteKey?: string;
}): Promise<void> {
  const baseUrl = process.env.SHIELD_INTERNAL_URL?.replace(/\/$/, "");
  const secret = process.env.SHOPIFY_ACTIVATION_INTERNAL_SECRET;
  if (!baseUrl || !secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Shopify activation reporting is not configured");
    }
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/internal/v1/shield/shopify/activation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Activation-Secret": secret,
      },
      body: JSON.stringify({
        event_name: input.eventName,
        shop_domain: input.shopDomain.toLowerCase(),
        ...(input.siteKey ? {site_key: input.siteKey} : {}),
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      console.error("Shopify activation milestone was rejected", {
        eventName: input.eventName,
        shopDomain: input.shopDomain,
        status: response.status,
      });
    }
  } catch (error) {
    console.error("Shopify activation milestone could not be reported", {
      eventName: input.eventName,
      shopDomain: input.shopDomain,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
