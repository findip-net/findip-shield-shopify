
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {reportShopifyActivation} from "../activation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {session} = await authenticate.admin(request);
  await reportShopifyActivation({
    eventName: "shopify_install_completed",
    shopDomain: session.shop,
  });

  return null;
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
