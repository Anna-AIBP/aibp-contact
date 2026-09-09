import { COMPANY } from '../lib/company.js';

// Deliberately not a staff directory — the roster carries mobile numbers, and
// a public index of them is not something a contact-card service should offer.
export default function Home() {
  return (
    <main className="landing">
      <img className="landing-logo" src="/logo-white.png" alt="AIBP by Industry Platform" />
      <p className="landing-copy">
        Digital contact cards for the AIBP team. Scan a colleague&rsquo;s QR code
        or follow the link on their name card to reach their card.
      </p>
      <a className="landing-link" href={COMPANY.websiteUrl}>{COMPANY.website}</a>
    </main>
  );
}
