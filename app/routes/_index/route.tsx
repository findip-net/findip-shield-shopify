import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>FindIP Shield for Shopify</h1>
        <p className={styles.text}>
          Detect VPNs, proxies, Tor, datacenter traffic, and other high-risk
          storefront visits with privacy-conscious network and event metadata.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Install securely.</strong> Installation begins only from
            the FindIP Shield listing in the Shopify App Store.
          </li>
          <li>
            <strong>Open an installed app.</strong> In Shopify admin, go to
            Apps and select FindIP Shield.
          </li>
          <li>
            <strong>Need help?</strong> Contact info@findip.net.
          </li>
        </ul>
      </div>
    </div>
  );
}
