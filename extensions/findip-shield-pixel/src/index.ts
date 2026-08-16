import {register, type StandardEvent} from "@shopify/web-pixels-extension";

const ENDPOINT = "https://shield.findip.net/v1/shield/track";
const SESSION_KEY = "_findip_shield_sid";
const SESSION_STARTED_KEY = "_findip_shield_started";

const eventNames: Record<string, string> = {
  page_viewed: "page_view",
  checkout_started: "checkout_started",
  payment_info_submitted: "payment_attempt",
};

function createSessionId() {
  return `shp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

register(({analytics, browser, settings}) => {
  const siteKey = typeof settings.siteKey === "string" ? settings.siteKey.trim() : "";
  if (!/^pub_[A-Za-z0-9_-]+$/.test(siteKey)) return;

  const sessionPromise = browser.sessionStorage.getItem(SESSION_KEY).then(async (stored) => {
    if (stored) return stored;
    const created = createSessionId();
    await browser.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  });

  const send = async (event: StandardEvent, sessionStart = false) => {
    const sessionId = await sessionPromise;
    const location = event.context.document.location;
    const navigator = event.context.navigator;
    const windowSnapshot = event.context.window;
    const shopifyEventName = event.name;

    const payload = {
      site_key: siteKey,
      sdk: {name: "findip-shield-shopify", version: "0.1.0", integration: "shopify"},
      event: {
        name: sessionStart ? "session_start" : (eventNames[shopifyEventName] ?? "custom"),
        timestamp: event.timestamp,
        source: "shopify_web_pixel",
        auto_detected: true,
        confidence: 1,
        detection_method: "shopify_standard_event",
      },
      page: {
        url: `${location.origin}${location.pathname}`,
        path: location.pathname,
        title: event.context.document.title,
        referrer: event.context.document.referrer,
      },
      session: {session_id: sessionId},
      browser: {
        user_agent: navigator.userAgent,
        language: navigator.language,
        languages: [...navigator.languages],
        cookie_enabled: navigator.cookieEnabled,
        viewport_width: windowSnapshot.innerWidth,
        viewport_height: windowSnapshot.innerHeight,
      },
      customer_context: {integration: "shopify", shopify_event_name: shopifyEventName},
      privacy: {
        mode: "strict",
        consent: {granted: true, source: "shopify_customer_privacy"},
      },
    };

    void fetch(ENDPOINT, {
      method: "POST",
      headers: {"Content-Type": "text/plain"},
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  };

  analytics.subscribe("all_standard_events", (event) => {
    void browser.sessionStorage.getItem(SESSION_STARTED_KEY).then(async (started) => {
      if (!started) {
        await browser.sessionStorage.setItem(SESSION_STARTED_KEY, "1");
        await send(event, true);
      }
      await send(event);
    });
  });
});
