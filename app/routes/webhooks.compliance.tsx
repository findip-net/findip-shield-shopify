import type {ActionFunctionArgs} from "react-router";
import {authenticate} from "../shopify.server";
import db from "../db.server";

export const action = async ({request}: ActionFunctionArgs) => {
  const {shop, topic} = await authenticate.webhook(request);
  // This app stores no Shopify customer or order data. Its only Shopify data is
  // the authenticated shop session, which is removed when the shop is redacted.
  if (topic === "SHOP_REDACT") {
    await db.session.deleteMany({where: {shop}});
  }
  return new Response(null, {status: 200});
};
