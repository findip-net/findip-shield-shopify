export default function PrivacyPage() {
  return (
    <s-page heading="Privacy">
      <s-section heading="Data minimization">
        <s-paragraph>
          FindIP Shield processes storefront event metadata and the visitor IP
          address observed by FindIP&apos;s servers to produce a network risk score.
        </s-paragraph>
        <s-paragraph>
          This integration does not transmit customer names, email addresses,
          phone numbers, postal addresses, Shopify customer IDs, cart contents,
          search terms, or payment information.
        </s-paragraph>
      </s-section>
      <s-section heading="Customer privacy">
        <s-paragraph>
          The pixel declares analytics processing to Shopify and executes only
          when Shopify&apos;s Customer Privacy system permits it.
        </s-paragraph>
        <s-link href="https://findip.net/privacy" target="_blank">Read FindIP&apos;s privacy policy</s-link>
      </s-section>
    </s-page>
  );
}
