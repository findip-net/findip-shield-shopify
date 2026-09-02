import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import {reportShopifyActivation} from "../activation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {session} = await authenticate.admin(request);
  // First authenticated app open is the durable install-complete boundary.
  // Replays are safe because the Shield ledger is unique per shop/milestone.
  await Promise.all([
    reportShopifyActivation({
      eventName: "shopify_install_completed",
      shopDomain: session.shop,
    }),
    reportShopifyActivation({
      eventName: "shopify_app_opened",
      shopDomain: session.shop,
    }),
  ]);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Shield settings</s-link>
        <s-link href="/app/additional">Privacy</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
