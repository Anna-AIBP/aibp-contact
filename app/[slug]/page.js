import { notFound } from 'next/navigation';
import { getRoster, getPerson } from '../../lib/sheet.js';
import { COMPANY, marketColour } from '../../lib/company.js';

export const revalidate = 60;    // sheet edits appear within a minute
export const dynamicParams = true; // a new sheet row resolves on first request

export async function generateStaticParams() {
  const people = await getRoster();
  return people.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getPerson(slug);
  if (!p) return { title: 'Not found' };
  const title = p.jobTitle ? `${p.displayName} — ${p.jobTitle}` : p.displayName;
  return {
    title: p.displayName,
    description: `${title}, AIBP.`,
    openGraph: { title, description: COMPANY.blurb.slice(0, 180), images: p.photo ? [p.photo] : [] },
  };
}

const digits = (s) => String(s || '').replace(/[^\d]/g, '');

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; }
}

export default async function CardPage({ params }) {
  const { slug } = await params;
  const p = await getPerson(slug);
  if (!p) notFound();

  const accent = marketColour(p.basedIn);
  const wa = digits(p.mobile);
  const metaLine = [p.team, p.basedIn].filter(Boolean).join(' · ');

  // Column U: line 1 is the label, the rest is the headline.
  const landingLines = String(p.landingDescriptor || '')
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hasLanding = Boolean(p.landingUrl);
  const landingLabel = landingLines.length > 1 ? landingLines[0] : '';
  const landingHeadline =
    landingLines.length > 1 ? landingLines.slice(1).join(' ')
      : landingLines[0] || hostOf(p.landingUrl);

  return (
    <main className="card" style={{ '--market': accent }}>
      <div className="brandbar">
        <span className="lockup-panel">
          <img className="lockup" src="/logo-colour.png" alt="AIBP by Industry Platform" />
        </span>
      </div>

      {p.photo ? (
        <div className="hero">
          <div className="shot">
            <img src={p.photo} alt={p.displayName} />
          </div>
          <div className="scrim" />
          <div className="nameplate">
            <div className="rule" />
            <h1 className="name">{p.displayName}</h1>
            {p.jobTitle ? <div className="role">{p.jobTitle}</div> : null}
            {metaLine ? <div className="meta">{metaLine}</div> : null}
          </div>
        </div>
      ) : (
        <div className="identity">
          <div className="rule" />
          <h1 className="name">{p.displayName}</h1>
          {p.jobTitle ? <div className="role">{p.jobTitle}</div> : null}
          {metaLine ? <div className="meta">{metaLine}</div> : null}
        </div>
      )}

      <div className="actions">
        <a className="btn btn-save" href={`/${p.slug}/vcard`} download={`${p.slug}.vcf`}>
          Save to contacts
        </a>
        <div className="btn-trio">
          {wa ? (
            <a className="btn btn-min" href={`https://wa.me/${wa}`} rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.8-5.3A8.4 8.4 0 1 1 21 11.5z" /></svg>
              WhatsApp
            </a>
          ) : null}
          {p.email ? (
            <a className="btn btn-min" href={`mailto:${p.email}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="m3 6 9 7 9-7" /></svg>
              Email
            </a>
          ) : null}
          {p.linkedin ? (
            <a className="btn btn-min" href={p.linkedin} rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7v.01M11.5 17v-4a2.5 2.5 0 0 1 5 0v4" /></svg>
              LinkedIn
            </a>
          ) : null}
        </div>
      </div>

      <div className="record">
        {p.mobile ?      <Row k="Mobile"   v={<a href={`tel:${p.mobile}`}>{p.mobile}</a>} /> : null}
        {p.email ?       <Row k="Email"    v={<a href={`mailto:${p.email}`}>{p.email}</a>} /> : null}
        {p.officePhone ? <Row k="Office"   v={<a href={`tel:${p.officePhone}`}>{p.officePhone}</a>} /> : null}
        {p.officeAddress ? <Row k="Address" v={p.officeAddress} /> : null}
      </div>

      {hasLanding ? (
        <a className="band" href={p.landingUrl} rel="noopener">
          <div className="bar" />
          <div className="txt">
            {landingLabel ? <div className="lbl">{landingLabel}</div> : null}
            <div className="hl">{landingHeadline}</div>
          </div>
          <div className="arrow" aria-hidden="true">&rarr;</div>
        </a>
      ) : null}

      <div className="about">
        <div className="about-label">About AIBP</div>
        <p className="desc">{COMPANY.blurb}</p>
        <div className="pillars">{COMPANY.pillars}</div>
        <div className="legal">{COMPANY.legalName}</div>
      </div>

      <div className="foot">
        <a href={COMPANY.websiteUrl}>{COMPANY.website}</a>
      </div>
    </main>
  );
}

function Row({ k, v }) {
  return (
    <div className="row">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
