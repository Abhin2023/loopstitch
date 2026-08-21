export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <p className="font-mono text-xs text-riot tracking-widest uppercase mb-4">Legal</p>
      <h1 className="font-display text-4xl sm:text-5xl uppercase text-paper mb-4 leading-tight">
        Privacy &amp; Refund Policy
      </h1>
      <p className="font-mono text-xs text-slate mb-10">Effective date: August 21, 2026</p>

      <div className="space-y-8 text-paper/75 text-sm sm:text-base leading-relaxed">
        {/* ── PRIVACY POLICY ── */}
        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">1. Information We Collect</h2>
          <p>
            When you place an order on Loopstitch Co., we collect the following personal information:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping address (including city, state, and pincode)</li>
          </ul>
          <p className="mt-3">
            We also automatically collect certain information when you visit our website, including your
            IP address, browser type, device type, pages visited, and time spent on pages, through
            standard web server logs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Process and fulfill your orders</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Communicate with you about your order or inquiries</li>
            <li>Improve our website, products, and services</li>
            <li>Detect and prevent fraud or unauthorized access</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">3. Information Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share
            your information only in the following circumstances:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>With shipping carriers to deliver your order (e.g., name, address, phone number)</li>
            <li>With payment processors to complete transactions</li>
            <li>When required by law or to protect our legal rights</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction. However,
            no method of transmission over the internet is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">5. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes
            outlined in this policy, unless a longer retention period is required or permitted by law.
            Order-related data is retained for a minimum of 3 years for tax and accounting purposes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">6. Cookies &amp; Tracking</h2>
          <p>
            Our website uses essential cookies to maintain functionality (e.g., cart persistence, theme
            preference). We do not use third-party advertising cookies or tracking technologies. You may
            disable cookies in your browser settings, though some features may not function properly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">7. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal information. To exercise
            these rights, please contact us at{' '}
            <a href="mailto:hello@loopstitch.online" className="text-acid hover:text-riot transition-colors">
              hello@loopstitch.online
            </a>.
            We will respond to your request within 30 days.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page
            with an updated effective date. Your continued use of the website after changes are posted
            constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* ── REFUND POLICY ── */}
        <hr className="cutline my-12" />

        <section>
          <h2 className="font-display text-2xl uppercase text-paper mb-3">Refund Policy</h2>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">9. Eligibility for Refunds</h2>
          <p>
            We offer refunds only in the following situations:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The product received is defective (e.g., printing errors, fabric defects)</li>
            <li>The product received is damaged during shipping</li>
            <li>The wrong product or size was delivered</li>
          </ul>
          <p className="mt-3">
            Due to the made-to-order and limited-edition nature of our products, we do not offer refunds
            for change of mind, incorrect size selection by the customer, or buyer's remorse.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">10. How to Request a Refund</h2>
          <p>
            To request a refund, please email us at{' '}
            <a href="mailto:hello@loopstitch.online" className="text-acid hover:text-riot transition-colors">
              hello@loopstitch.online
            </a>{' '}
            within <strong className="text-paper">7 days of delivery</strong> with the following information:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Your order number</li>
            <li>A description of the issue</li>
            <li>Photographic evidence of the defect, damage, or incorrect item</li>
          </ul>
          <p className="mt-3">
            Requests received after 7 days of delivery will not be eligible for a refund.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">11. Refund Process</h2>
          <p>
            Once we verify the issue and confirm eligibility, we will initiate a refund to your original
            payment method. Refunds are processed within <strong className="text-paper">7–10 business
            days</strong> from the date of approval. You will receive an email confirmation once the
            refund has been processed.
          </p>
          <p className="mt-3">
            In some cases, we may offer a replacement or store credit instead of a monetary refund, at
            our discretion.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">12. Non-Refundable Items</h2>
          <p>The following are not eligible for refunds:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Products returned without prior authorization from us</li>
            <li>Products that have been worn, washed, altered, or damaged by the customer</li>
            <li>Requests made after the 7-day return window</li>
            <li>Items purchased during clearance or final-sale drops (if applicable)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase text-paper mb-3">13. Contact for Refunds</h2>
          <p>
            For any refund-related questions, please reach out to us at{' '}
            <a href="mailto:hello@loopstitch.online" className="text-acid hover:text-riot transition-colors">
              hello@loopstitch.online
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
