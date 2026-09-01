import {useEffect} from "react";
import type {ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData} from "react-router";
import {useAppBridge} from "@shopify/app-bridge-react";
import {boundary} from "@shopify/shopify-app-react-router/server";
import {authenticate} from "../shopify.server";

type AdminClient = Awaited<ReturnType<typeof authenticate.admin>>["admin"];
type PixelResponse = {
  data?: {webPixel?: {id: string; settings: unknown} | null};
  errors?: Array<{message: string}>;
};
type MutationResponse = {
  data?: {
    webPixelCreate?: {userErrors: Array<{message: string}>};
    webPixelUpdate?: {userErrors: Array<{message: string}>};
  };
  errors?: Array<{message: string}>;
};

type ActionResponse = {
  intent: "connect" | "verify";
  ok: boolean;
  connected?: boolean;
  siteKey?: string;
  error: string | null;
};

function getPixelSiteKey(settings: unknown) {
  let parsed = settings;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return "";
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
  const siteKey = (parsed as Record<string, unknown>).siteKey;
  return typeof siteKey === "string" && /^pub_[A-Za-z0-9_-]+$/.test(siteKey.trim())
    ? siteKey.trim()
    : "";
}

async function getPixel(admin: AdminClient) {
  try {
    const response = await admin.graphql(`#graphql
      query FindIpShieldPixel { webPixel { id settings } }
    `);
    return (await response.json()) as PixelResponse;
  } catch (error) {
    // Shopify reports a missing singleton WebPixel as a GraphQL exception
    // instead of returning null. That is the normal state before first setup.
    if (error instanceof Error && error.message.includes("No web pixel was found")) {
      return {data: {webPixel: null}} satisfies PixelResponse;
    }
    throw error;
  }
}

export const loader = async ({request}: LoaderFunctionArgs) => {
  const {admin, session} = await authenticate.admin(request);
  const result = await getPixel(admin);
  const siteKey = getPixelSiteKey(result.data?.webPixel?.settings);
  return {
    connected: Boolean(result.data?.webPixel?.id && siteKey),
    siteKey,
    shopDomain: session.shop,
  };
};

export const action = async ({request}: ActionFunctionArgs) => {
  const {admin} = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") === "verify" ? "verify" : "connect";

  if (intent === "verify") {
    try {
      const current = await getPixel(admin);
      const pixel = current.data?.webPixel;
      if (!pixel?.id) {
        return {
          intent,
          ok: false,
          connected: false,
          error: "No FindIP Shield Web Pixel is connected. Add your public site key first.",
        } satisfies ActionResponse;
      }
      const siteKey = getPixelSiteKey(pixel.settings);
      if (!siteKey) {
        return {
          intent,
          ok: false,
          connected: false,
          error: "The Web Pixel exists, but its public site key is missing. Save the connection again.",
        } satisfies ActionResponse;
      }
      return {
        intent,
        ok: true,
        connected: true,
        siteKey,
        error: null,
      } satisfies ActionResponse;
    } catch {
      return {
        intent,
        ok: false,
        error: "Shopify could not check the Web Pixel. Reload the app and try again.",
      } satisfies ActionResponse;
    }
  }

  const siteKey = String(formData.get("siteKey") ?? "").trim();
  if (!/^pub_[A-Za-z0-9_-]+$/.test(siteKey) || siteKey.length > 64) {
    return {
      intent,
      ok: false,
      error: "Enter the public site key from Shield → Sites. It must begin with pub_.",
    } satisfies ActionResponse;
  }

  try {
    const current = await getPixel(admin);
    const pixelId = current.data?.webPixel?.id;
    const mutation = pixelId
      ? `#graphql
          mutation UpdateFindIpShieldPixel($id: ID!, $settings: JSON!) {
            webPixelUpdate(id: $id, webPixel: {settings: $settings}) {
              userErrors { message }
            }
          }`
      : `#graphql
          mutation CreateFindIpShieldPixel($settings: JSON!) {
            webPixelCreate(webPixel: {settings: $settings}) {
              userErrors { message }
            }
          }`;
    const response = await admin.graphql(mutation, {
      variables: pixelId
        ? {id: pixelId, settings: JSON.stringify({siteKey})}
        : {settings: JSON.stringify({siteKey})},
    });
    const result = (await response.json()) as MutationResponse;
    const userErrors = pixelId
      ? result.data?.webPixelUpdate?.userErrors
      : result.data?.webPixelCreate?.userErrors;
    const error = userErrors?.[0]?.message ?? result.errors?.[0]?.message;
    return error
      ? {
          intent,
          ok: false,
          connected: Boolean(pixelId),
          error: `Shopify could not save the Web Pixel: ${error}`,
        } satisfies ActionResponse
      : {
          intent,
          ok: true,
          connected: true,
          siteKey,
          error: null,
        } satisfies ActionResponse;
  } catch {
    return {
      intent,
      ok: false,
      error: "Shopify could not save the Web Pixel. Reload the app and try again.",
    } satisfies ActionResponse;
  }
};

export default function Index() {
  const initial = useLoaderData<typeof loader>();
  const connectionFetcher = useFetcher<typeof action>();
  const verificationFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const connected =
    verificationFetcher.data?.connected ??
    connectionFetcher.data?.connected ??
    initial.connected;
  const isSaving = connectionFetcher.state !== "idle";
  const isVerifying = verificationFetcher.state !== "idle";

  useEffect(() => {
    if (connectionFetcher.data?.ok) shopify.toast.show("FindIP Shield is connected");
  }, [connectionFetcher.data?.ok, shopify]);

  useEffect(() => {
    if (verificationFetcher.data?.ok) shopify.toast.show("Web Pixel connection verified");
  }, [shopify, verificationFetcher.data?.ok]);

  return (
    <s-page heading="FindIP Shield">
      <s-section heading="Setup guide">
        <s-paragraph>
          Complete these steps to start receiving privacy-conscious storefront risk results.
        </s-paragraph>
        <s-box border="base" borderRadius="base" padding="base">
          <s-stack direction="block" gap="base">
            <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
              <s-badge tone={connected ? "success" : "info"}>1</s-badge>
              <s-stack direction="block" gap="small-200">
                <s-heading>Create a Shield site</s-heading>
                <s-paragraph color="subdued">
                  Register {initial.shopDomain} and copy its public site key.
                </s-paragraph>
              </s-stack>
              <s-link href="https://findip.net/shield/sites/new" target="_blank">
                Create site
              </s-link>
            </s-grid>
            <s-divider />
            <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
              <s-badge tone={connected ? "success" : "info"}>2</s-badge>
              <s-stack direction="block" gap="small-200">
                <s-heading>Connect the Shopify Web Pixel</s-heading>
                <s-paragraph color="subdued">
                  Save the public key below, then test the connection.
                </s-paragraph>
              </s-stack>
              <s-badge tone={connected ? "success" : "info"}>
                {connected ? "Connected" : "Pending"}
              </s-badge>
            </s-grid>
            <s-divider />
            <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
              <s-badge tone="info">3</s-badge>
              <s-stack direction="block" gap="small-200">
                <s-heading>Verify the first storefront event</s-heading>
                <s-paragraph color="subdued">
                  Visit the storefront with analytics consent enabled, then confirm the event in Shield.
                </s-paragraph>
              </s-stack>
              <s-link href="https://findip.net/shield/sites" target="_blank">
                Open events
              </s-link>
            </s-grid>
          </s-stack>
        </s-box>
      </s-section>

      <s-section heading="Connect Shield">
        <s-paragraph>
          FindIP Shield detects VPN, proxy, Tor, hosting, and malicious traffic from consented
          storefront events. No theme changes are required.
        </s-paragraph>
        <connectionFetcher.Form method="post">
          <input type="hidden" name="intent" value="connect" />
          <s-stack direction="block" gap="base">
            <s-text-field
              name="siteKey"
              label="Public site key"
              value={initial.siteKey}
              placeholder="pub_..."
              autocomplete="off"
            />
            {connectionFetcher.data?.error ? (
              <s-banner heading="Connection not saved" tone="critical">
                {connectionFetcher.data.error}
              </s-banner>
            ) : null}
            <s-stack direction="inline" gap="base">
              <s-button type="submit" variant="primary" {...(isSaving ? {loading: true} : {})}>
                {connected ? "Update connection" : "Connect Shield"}
              </s-button>
              <s-link href="https://findip.net/docs/shield/shopify" target="_blank">
                Shopify setup guide
              </s-link>
            </s-stack>
          </s-stack>
        </connectionFetcher.Form>
      </s-section>

      <s-section slot="aside" heading="Status">
        <s-stack direction="block" gap="base">
          <s-badge size="large" tone={connected ? "success" : "warning"}>
            {connected ? "Connected" : "Not connected"}
          </s-badge>
          <s-paragraph>Storefront: {initial.shopDomain}</s-paragraph>
          <verificationFetcher.Form method="post">
            <input type="hidden" name="intent" value="verify" />
            <s-button
              type="submit"
              variant="secondary"
              {...(isVerifying ? {loading: true} : {})}
            >
              Test connection
            </s-button>
          </verificationFetcher.Form>
          {verificationFetcher.data?.error ? (
            <s-banner heading="Connection test failed" tone="critical">
              {verificationFetcher.data.error}
            </s-banner>
          ) : null}
          {verificationFetcher.data?.ok ? (
            <s-banner heading="Web Pixel verified" tone="success">
              Shopify has an active FindIP Shield Web Pixel with a public site key.
            </s-banner>
          ) : null}
        </s-stack>
      </s-section>

      <s-section heading="Privacy by design">
        <s-unordered-list>
          <s-list-item>Runs only when Shopify permits analytics processing.</s-list-item>
          <s-list-item>Does not send names, emails, addresses, customer IDs, or payment details.</s-list-item>
          <s-list-item>Uses a session-only pseudonymous identifier.</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
