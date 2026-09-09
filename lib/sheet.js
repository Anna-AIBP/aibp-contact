import fs from 'node:fs';
import path from 'node:path';
import { deriveSlug, assertUniqueSlugs } from './slug.js';

// Headers carry noise like "Job Title (FILL)" and "Based In (verify)", so match
// on a normalised form rather than an exact string or a fixed column index.
// A URL typed without a scheme ("www.aibp.sg", "linkedin.com/in/x") is treated
// by the browser as a path relative to the current site, so it resolves to
// contact.aibp.sg/www.aibp.sg — a dead link. Nobody filling a spreadsheet
// should have to remember "https://", so normalise it here instead.
function normalizeUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;   // already explicit
  if (v.startsWith('/')) return v;                     // deliberate internal link
  return 'https://' + v.replace(/^\/+/, '');
}

const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z]/g, '');

const FIELD_MATCHERS = [
  ['include',       (h) => h.startsWith('include')],
  ['slug',          (h) => h === 'slug'],
  ['displayName',   (h) => h.startsWith('displayname')],
  ['firstName',     (h) => h.startsWith('firstname')],
  ['lastName',      (h) => h.startsWith('lastname')],
  ['jobTitle',      (h) => h.startsWith('jobtitle')],
  ['team',          (h) => h === 'team'],
  ['email',         (h) => h === 'email'],
  ['mobile',        (h) => h.startsWith('mobile')],
  ['officePhone',   (h) => h.startsWith('officephone')],
  ['linkedin',      (h) => h.startsWith('linkedin')],
  ['basedIn',       (h) => h.startsWith('basedin')],
  ['notes',         (h) => h === 'notes'],
  ['photo',         (h) => h.startsWith('photo')],
  ['officeAddress', (h) => h.startsWith('officeaddress')],
  ['landingDescriptor', (h) => h.startsWith('landingpagedescriptor')],
  ['landingUrl', (h) => h.startsWith('landingpageurl')],
  ['logoTitle', (h) => h.startsWith('logotitle')],
  ['logoTheme', (h) => h.startsWith('logocarousel')],
];

function mapHeaders(headerRow) {
  const idx = {};
  headerRow.forEach((raw, i) => {
    const h = norm(raw);
    for (const [field, test] of FIELD_MATCHERS) {
      if (idx[field] === undefined && test(h)) { idx[field] = i; break; }
    }
  });
  return idx;
}

// The Logos tab: Name | Theme | Photo URL. Matched to a person by their
// "Logo Carousel" value, case-insensitively so "Deffrey" and "deffrey " agree.
function rowsToLogos(rows) {
  if (!rows || rows.length < 2) return [];
  const head = rows[0].map(norm);
  const iName = head.findIndex((h) => h === 'name');
  const iTheme = head.findIndex((h) => h === 'theme');
  const iUrl = head.findIndex((h) => h.startsWith('photourl') || h.startsWith('logourl') || h === 'url');
  if (iUrl === -1) return [];

  return rows.slice(1).reduce((out, row) => {
    const url = normalizeUrl(row[iUrl]);
    if (!url) return out;
    out.push({
      name: iName === -1 ? '' : String(row[iName] || '').trim(),
      theme: iTheme === -1 ? '' : String(row[iTheme] || '').trim().toLowerCase(),
      url,
    });
    return out;
  }, []);
}

function rowsToPeople(rows, logoRows) {
  const allLogos = rowsToLogos(logoRows);
  if (!rows || !rows.length) return [];
  const idx = mapHeaders(rows[0]);
  const people = [];

  for (const row of rows.slice(1)) {
    const first = String(row[0] || '').trim();
    // The company block sits below a blank row at the bottom of the sheet.
    if (first.toUpperCase().startsWith('COMPANY DETAILS')) break;

    const get = (f) => (idx[f] === undefined ? '' : String(row[idx[f]] || '').trim());
    const email = get('email');
    if (!email && !get('slug')) continue;             // blank spacer row

    // Column A gates publication: only an explicit Y goes live. VERIFY rows,
    // and anything left blank, stay dark.
    if (get('include').toUpperCase() !== 'Y') continue;

    const person = {
      slug: '',
      displayName: get('displayName') || [get('firstName'), get('lastName')].filter(Boolean).join(' '),
      firstName: get('firstName'),
      lastName: get('lastName'),
      jobTitle: get('jobTitle'),
      team: get('team'),
      email,
      mobile: get('mobile'),
      officePhone: get('officePhone'),
      linkedin: normalizeUrl(get('linkedin')),
      basedIn: get('basedIn'),
      photo: normalizeUrl(get('photo')),
      officeAddress: get('officeAddress'),
      // Column U holds two lines in one cell: label on line 1, headline on line 2.
      landingDescriptor: (idx.landingDescriptor === undefined ? '' : String(row[idx.landingDescriptor] || '')),
      landingUrl: normalizeUrl(get('landingUrl')),
      logoTitle: get('logoTitle'),
      _slugOverride: get('slug'),
    };

    // Both columns must be filled, and the theme must actually match something.
    const theme = get('logoTheme').toLowerCase();
    person.logos = theme && person.logoTitle
      ? allLogos.filter((l) => l.theme === theme)
      : [];
    person.slug = deriveSlug({ slug: person._slugOverride, email: person.email, displayName: person.displayName, firstName: person.firstName });
    delete person._slugOverride;
    people.push(person);
  }

  return assertUniqueSlugs(people);
}

// The roster arrives as raw sheet rows from an Apps Script Web App running as
// the sheet owner. No service account, nothing to share, nothing for Workspace
// policy to block. The token in the query string is what gates access.
async function fromWebApp() {
  const { ROSTER_API_URL, ROSTER_API_TOKEN } = process.env;
  if (!ROSTER_API_URL || !ROSTER_API_TOKEN) return null;

  const url = `${ROSTER_API_URL}?token=${encodeURIComponent(ROSTER_API_TOKEN)}`;
  // Apps Script /exec redirects to googleusercontent.com; fetch follows it.
  const res = await fetch(url, { redirect: 'follow', next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`Roster API returned HTTP ${res.status}. Check ROSTER_API_URL points at the /exec deployment.`);
  }

  // Apps Script cannot set a status code, so failures come back as 200 with an
  // error key. Trusting res.ok alone would silently serve an empty roster.
  const data = await res.json();
  if (data.error) {
    throw new Error(
      data.error === 'unauthorized'
        ? 'Roster API rejected the token. ROSTER_API_TOKEN must match the script property exactly.'
        : `Roster API error: ${data.error}`
    );
  }
  if (!Array.isArray(data.values)) {
    throw new Error('Roster API returned no rows. Is the roster on the first sheet tab?');
  }

  return rowsToPeople(data.values, data.logos);
}

function fromFixture() {
  const p = path.join(process.cwd(), 'data', 'fixture.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return rowsToPeople(raw.values, raw.logos);
}

// Falls back to the fixture when credentials are absent, so `npm run dev`
// works for anyone who clones the repo without the service account.
export async function getRoster() {
  const live = await fromWebApp();
  if (live) return live;
  console.warn('[roster] ROSTER_API_URL / ROSTER_API_TOKEN not set — serving data/fixture.json');
  return fromFixture();
}

export async function getPerson(slug) {
  const people = await getRoster();
  return people.find((p) => p.slug === slug) || null;
}
