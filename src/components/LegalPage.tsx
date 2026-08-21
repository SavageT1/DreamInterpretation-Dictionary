import type { ReactNode } from 'react';

type LegalPageProps = { path: string };

const updated = 'August 20, 2026';

const pages: Record<string, { title: string; intro: string; content: ReactNode }> = {
  '/privacy': {
    title: 'Privacy Policy',
    intro: `Last updated ${updated}. This policy explains how Dream Interpretation Dictionary handles information.`,
    content: <>
      <h2>Information you enter</h2><p>Dream text submitted for a reading is processed to generate that requested reading. If you choose to sign in, saved dream titles, notes, dreams, and readings are stored in your private Firebase account so they can appear across your devices. Signed-out saves remain in your browser. Do not enter names, phone numbers, financial information, medical records, or other identifying information.</p>
      <h2>Analytics and advertising</h2><p>We use Google Analytics to understand aggregated site usage. Google AdSense may be used to display advertising after approval. Google and other third-party vendors may use cookies, web beacons, IP addresses, or similar identifiers to measure traffic, prevent fraud, report performance, and—when you consent—personalize advertising.</p>
      <p>Google's use of information is described in <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from sites or apps that use its services</a>. You can manage personalized advertising in <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>
      <h2>Your choices</h2><p>You may reject optional analytics and advertising storage using the notice shown on this site. You can delete individual cloud-saved dreams from your Vault, sign out, or clear signed-out saves and consent choices through browser storage controls.</p>
      <h2>Affiliate links</h2><p>Some clearly labeled sponsored links are affiliate links. We may receive a commission if you make a qualifying purchase, at no extra cost to you. Affiliate partners may process visits under their own privacy policies.</p>
      <h2>Interpretation and payment providers</h2><p>Dream text submitted for a reading is sent securely to our automated interpretation provider to generate the requested response. We ask the provider not to retain the response for later retrieval. Subscription checkout and billing are handled by Stripe; we do not receive or store your complete payment-card number.</p>
      <h2>Data retention and security</h2><p>Cloud journal entries remain in your private account until you delete them. Signed-out journal entries remain on your device until deleted or browser storage is cleared. Interpretation requests are processed to return the requested result. We use HTTPS, authenticated access controls, and request limits, but no online service can promise absolute security.</p>
      <h2>Children</h2><p>This general-audience service is not directed to children under 13, and we do not knowingly collect their personal information.</p>
      <h2>Contact</h2><p>Privacy questions can be sent to <a href="mailto:office@a1tradelines.com">office@a1tradelines.com</a>.</p>
    </>,
  },
  '/terms': {
    title: 'Terms of Use', intro: `Last updated ${updated}. By using this website, you agree to these terms.`, content: <>
      <h2>Educational and reflective use</h2><p>Dream readings are provided for entertainment, journaling, and personal reflection. Symbols do not have one universal meaning, and a reading is not a factual prediction or professional opinion.</p>
      <h2>No professional advice</h2><p>The service does not provide medical, mental-health, legal, or financial advice and is not a substitute for a qualified professional. If a dream or waking experience causes distress or raises safety concerns, contact an appropriate licensed professional or emergency service.</p>
      <h2>Acceptable use</h2><p>Do not misuse the service, attempt to disrupt it, submit unlawful material, probe its security, automate excessive requests, or enter another person's private information without permission.</p>
      <h2>Saved information</h2><p>Signed-in Vault entries are synchronized through your private account. Signed-out entries depend on browser storage and may be lost if storage is cleared or the device changes.</p>
      <h2>Subscriptions and cancellation</h2><p>Premium access is a recurring monthly subscription at the price shown before checkout. Stripe processes payment and renews the subscription automatically until you cancel. You can cancel future renewals from the billing-management link on the dream tool; cancellation takes effect at the end of the current paid period. Except where law requires otherwise, completed subscription charges are non-refundable.</p>
      <h2>Third-party services</h2><p>Sponsored resources and other external links lead to independent websites. We do not control their products, availability, claims, prices, or privacy practices.</p>
      <h2>Changes and availability</h2><p>Features and these terms may change. The service is provided as available without a guarantee of uninterrupted operation or a particular interpretation outcome.</p>
    </>,
  },
  '/about': {
    title: 'About This Project', intro: 'Dream Interpretation Dictionary is a private-first reflection tool for exploring dream symbols without treating them as predictions.', content: <>
      <h2>Our purpose</h2><p>Dreams often combine memory, emotion, stress, imagination, and recent experiences. This site helps people slow down, identify prominent symbols, consider emotional context, and save personal observations over time.</p>
      <h2>How readings are created</h2><p>The tool looks at the dream's language, emotional tone, settings, actions, and recurring symbolic themes. Readings use tentative language because the dreamer—not a dictionary or model—has the strongest context for what a symbol means personally.</p>
      <h2>Private-first journal</h2><p>You can use the interpretation without creating an account. Signing in protects saved titles, notes, dreams, and readings in a private cross-device Vault; signed-out saves remain local to that browser.</p>
      <h2>Funding</h2><p>The project is supported by clearly labeled affiliate recommendations and may use Google advertising. Commercial relationships do not change the interpretation text.</p>
    </>,
  },
  '/contact': {
    title: 'Contact', intro: 'Questions, corrections, privacy requests, and partnership inquiries are welcome.', content: <>
      <h2>Email</h2><p><a href="mailto:office@a1tradelines.com">office@a1tradelines.com</a></p>
      <h2>Helpful details</h2><p>For a technical problem, include the page address, device type, and what happened. Do not email private dream details, passwords, API keys, financial information, or medical records.</p>
      <h2>Response scope</h2><p>We can help with site operation and privacy questions, but we cannot provide individual medical or mental-health assessment through email.</p>
    </>,
  },
  '/editorial-policy': {
    title: 'Editorial & Interpretation Policy', intro: 'Our readings are designed to support reflection while avoiding certainty, diagnosis, and sensational claims.', content: <>
      <h2>Interpretation principles</h2><p>We consider emotional tone, common symbolic associations, the dream setting, and the dreamer's described reactions. We distinguish possibility from fact and avoid claiming that a dream predicts future events.</p>
      <h2>Automation disclosure</h2><p>Readings are produced with automated language technology. Automated output may be incomplete or mistaken and should be evaluated using your own life context. If the interpretation service is unavailable, the site will ask you to try again rather than presenting a simulated reading.</p>
      <h2>Safety boundaries</h2><p>We do not use readings to diagnose conditions or recommend treatment. Content that suggests imminent harm should be addressed with an appropriate qualified professional or emergency service, not a dream website.</p>
      <h2>Corrections</h2><p>If site-authored educational material is inaccurate or unclear, contact us with the page and suggested correction. We review substantive reports and update material when appropriate.</p>
    </>,
  },
};

export default function LegalPage({ path }: LegalPageProps) {
  const page = pages[path] || pages['/about'];
  return <main className="happy-site min-h-screen bg-celestial-gradient px-4 py-10 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <nav className="mb-10 flex flex-wrap gap-3 text-sm" aria-label="Primary navigation"><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/">Dream tool</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/about">About</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/privacy">Privacy</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/contact">Contact</a></nav>
      <article className="rounded-3xl border border-white/10 bg-slate-950/75 p-6 shadow-2xl sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Dream Interpretation Dictionary</p><h1 className="mt-4 font-display text-4xl font-bold text-white">{page.title}</h1><p className="mt-4 text-lg leading-8 text-slate-300">{page.intro}</p><div className="prose prose-invert mt-8 max-w-none prose-a:text-cyan-300 prose-h2:font-display prose-h2:text-white prose-p:leading-7">{page.content}</div>
      </article>
      <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a></footer>
    </div>
  </main>;
}
