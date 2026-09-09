import fs from 'node:fs';
import path from 'node:path';
import { deriveSlug, assertUniqueSlugs } from './slug.js';

// Headers carry noise like "Job Title (FILL)" and "Based In (verify)", so match
// on a normalised form rather than an exact string or a fixed column index.
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

function rowsToPeople(rows) {
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
      linkedin: get('linkedin'),
      basedIn: get('basedIn'),
      photo: get('photo'),
      officeAddress: get('officeAddress'),
      _slugOverride: get('slug'),
    };
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

  return rowsToPeople(data.values);
}

function fromFixture() {
  const p = path.join(process.cwd(), 'data', 'fixture.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return rowsToPeople(raw.values);
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
