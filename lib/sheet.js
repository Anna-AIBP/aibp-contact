import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { deriveSlug, assertUniqueSlugs } from './slug.js';

const RANGE = 'A1:R200';

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

async function fromGoogleSheets() {
  const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return null;

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Vercel stores the key with literal \n sequences; restore real newlines.
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: RANGE,
  });
  return rowsToPeople(res.data.values);
}

function fromFixture() {
  const p = path.join(process.cwd(), 'data', 'fixture.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return rowsToPeople(raw.values);
}

// Falls back to the fixture when credentials are absent, so `npm run dev`
// works for anyone who clones the repo without the service account.
export async function getRoster() {
  const live = await fromGoogleSheets();
  if (live) return live;
  console.warn('[roster] No Google credentials found — serving data/fixture.json');
  return fromFixture();
}

export async function getPerson(slug) {
  const people = await getRoster();
  return people.find((p) => p.slug === slug) || null;
}
