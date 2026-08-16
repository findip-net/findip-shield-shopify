import {useEffect} from "react";
import type {ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData} from "react-router";
import {useAppBridge} from "@shopify/app-bridge-react";
import {boundary} from "@shopify/shopify-app-react-router/server";
import {authenticate} from "../shopify.server";

type AdminClient = Awaited<ReturnType<typeof authenticate.admin>>["admin"];
type PixelResponse = {
  data?: {webPixel?: {id: string; settings: {siteKey?: string} | null} | null};
  errors?: Array<{message: string}>;
};
type MutationResponse = {
  data?: {
    webPixelCreate?: {userErrors: Array<{message: string}>};
    webPixelUpdate?: {userErrors: Array<{message: string}>};
  };
  errors?: Array<{message: string}>;
};

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
  const {admin} = await authenticate.admin(request);
  const result = await getPixel(admin);
  return {
    connected: Boolean(result.data?.webPixel?.id),
    siteKey: result.data?.webPixel?.settings?.siteKey ?? "",
  };
};

export const action = async ({request}: ActionFunctionArgs) => {
  const {admin} = await authenticate.admin(request);
  const formData = await request.formData();
  const siteKey = String(formData.get("siteKey") ?? "").trim();
  if (!/^pub_[A-Za-z0-9_-]+$/.test(siteKey) || siteKey.length > 64) {
    return {ok: false, error: "Enter a valid public site key beginning with pub_."};
  }

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
    variables: pixelId ? {id: pixelId, settings: {siteKey}} : {settings: {siteKey}},
  });
  const result = (await response.json()) as MutationResponse;
  const userErrors = pixelId
    ? result.data?.webPixelUpdate?.userErrors
    : result.data?.webPixelCreate?.userErrors;
  const error = userErrors?.[0]?.message ?? result.errors?.[0]?.message;
  return error ? {ok: false, error} : {ok: true, error: null};
};

export default function Index() {
  const initial = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const connected = fetcher.data?.ok ?? initial.connected;
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("FindIP Shield is connected");
  }, [fetcher.data?.ok, shopify]);

  return (
    <s-page heading="FindIP Shield">
      <s-section heading="Visitor risk detection">
        <s-paragraph>
          Connect this store to FindIP Shield to detect VPN, proxy, Tor, hosting,
          and malicious traffic from consented storefront events.
        </s-paragraph>
        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="siteKey"
              label="Public site key"
              value={initial.siteKey}
              placeholder="pub_..."
              autocomplete="off"
            />
            {fetcher.data?.error ? <s-banner tone="critical">{fetcher.data.error}</s-banner> : null}
            <s-button type="submit" variant="primary" {...(isSaving ? {loading: true} : {})}>
              {connected ? "Update connection" : "Connect Shield"}
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>
      <s-section slot="aside" heading="Status">
        <s-paragraph>{connected ? "Connected" : "Not connected"}</s-paragraph>
        <s-paragraph>Find your public key in the FindIP dashboard under Shield → Sites.</s-paragraph>
        <s-link href="https://findip.net/shield/sites/new" target="_blank">Create a Shield site</s-link>
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
